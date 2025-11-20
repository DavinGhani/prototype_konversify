import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

const ITEMS_PER_PAGE = 50; 

function App() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // --- STATE UNTUK FILTER ---
  const [filters, setFilters] = useState({
    cluster: 'all',
    job: 'all',
    housing: 'all',
    search: '' 
  });

  // --- STATE UNTUK SORTING ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // 1. Fetch Data
  useEffect(() => {
    fetch('https://prototypekonversify-production.up.railway.app/api/customers')
      .then(res => res.json())
      .then(data => {
        setAllCustomers(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Gagal mengambil data:", err);
        setIsLoading(false);
      });
  }, []);

  // 2. Ekstrak Opsi Unik untuk Dropdown Filter
  const uniqueJobs = useMemo(() => {
    const jobs = [...new Set(allCustomers.map(c => c.job))];
    return jobs.sort();
  }, [allCustomers]);

  const uniqueClusters = useMemo(() => {
    const clusters = [...new Set(allCustomers.map(c => c.cluster_label))];
    return clusters.sort();
  }, [allCustomers]);

  // 3. Logika Filter DAN Sorting
  const filteredCustomers = useMemo(() => {
    // A. Filter Data
    let sortableItems = allCustomers.filter(customer => {
      if (filters.cluster !== 'all' && customer.cluster_label !== filters.cluster) return false;
      if (filters.job !== 'all' && customer.job !== filters.job) return false;
      if (filters.housing !== 'all' && customer.housing !== filters.housing) return false;
      if (filters.search !== '' && 
          !customer.ID.toString().includes(filters.search)
      ) return false;
      return true;
    });

    // B. Sorting Data
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'probabilitas') {
           aValue = parseFloat(String(aValue).replace('%', '')) || 0;
           bValue = parseFloat(String(bValue).replace('%', '')) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [allCustomers, filters, sortConfig]);

  // 4. Logika Paginasi
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  // 5. Handler Perubahan Filter
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); 
  };

  // 6. Handler Sorting (3 Tahap)
  const requestSort = (key) => {
    let direction = 'desc'; 
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') {
        direction = 'asc'; 
      } else {
        setSortConfig({ key: null, direction: 'asc' });
        return; 
      }
    }
    setSortConfig({ key, direction });
  };

  // --- FUNGSI BANTUAN TAMPILAN ---
  const parseProb = (val) => {
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace('%', '')) || 0;
  };

  const getProbStyle = (val) => {
    if (val >= 80) return 'prob-high';
    if (val >= 50) return 'prob-medium';
    return 'prob-low';
  };

  const formatPrediksi = (val) => {
    const str = String(val).toLowerCase();
    if (str === 'yes' || str === '1') return 'Yes';
    return 'No';
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dasbor Prioritas Nasabah</h1>
      </header>
      
      <div className="container">
        
        
        <div className="filter-panel">
          <div className="filter-group">
            <label>Segmen (Cluster):</label>
            <select 
              value={filters.cluster} 
              onChange={(e) => handleFilterChange('cluster', e.target.value)}
            >
              <option value="all">Semua Segmen</option>
              {uniqueClusters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Pekerjaan:</label>
            <select 
              value={filters.job} 
              onChange={(e) => handleFilterChange('job', e.target.value)}
            >
              <option value="all">Semua Pekerjaan</option>
              {uniqueJobs.map(job => <option key={job} value={job}>{job}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Punya KPR?:</label>
            <select 
              value={filters.housing} 
              onChange={(e) => handleFilterChange('housing', e.target.value)}
            >
              <option value="all">Semua</option>
              <option value="yes">Ya (Yes)</option>
              <option value="no">Tidak (No)</option>
            </select>
          </div>

          <div className="filter-group">
             <label>Cari ID:</label>
             <input 
               type="text" 
               placeholder="ID Nasabah..." 
               value={filters.search}
               onChange={(e) => handleFilterChange('search', e.target.value)}
             />
          </div>
        </div>

        {/* --- INFO SUMMARY --- */}
        <div className="summary-bar">
          Menampilkan <strong>{filteredCustomers.length}</strong> nasabah dari total data.
        </div>

        {/* --- TABEL DATA --- */}
        {isLoading ? (
          <div className="loading">Memuat data...</div>
        ) : (
          <div className="table-container">
            <table className="customer-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>No</th>
                  <th>ID</th>
                  <th 
                    onClick={() => requestSort('probabilitas')}
                    style={{ cursor: 'pointer', userSelect: 'none', backgroundColor: sortConfig.key === 'probabilitas' ? '#e9ecef' : '' }}
                    title="Klik 1x: Tinggi-Rendah, 2x: Rendah-Tinggi, 3x: Reset"
                  >
                    Probabilitas 
                    {sortConfig.key === 'probabilitas' ? (sortConfig.direction === 'desc' ? ' 🔼' : ' 🔽') : ' ↕️'}
                  </th>

                  <th>Status Prediksi</th>
                  <th>Segmen (Cluster)</th>
                  <th>Usia</th>
                  <th>Pekerjaan</th>
                  <th>Saldo</th>
                  <th>KPR</th>
                  <th>Kontak Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((row, index) => {
                  const probValue = parseProb(row.probabilitas);
                  const prediksiText = formatPrediksi(row.prediksi);
                  const isPotential = prediksiText === 'Yes';
                  const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                  return (
                    <tr key={index}>
                      <td>{rowNumber}</td>
                      <td>#{row.ID}</td>
                      <td>
                        <span className={`prob-badge ${getProbStyle(probValue)}`}>
                          {probValue}% 
                        </span>
                      </td>
                      <td style={{fontWeight: 'bold', color: isPotential ? '#27ae60' : '#7f8c8d'}}>
                        {prediksiText}
                      </td>
                      <td>
                        <span className={`cluster-tag cluster-${row.cluster}`}>
                          {row.cluster_label}
                        </span>
                      </td>
                      <td>{row.age}</td>
                      <td>{row.job}</td>
                      <td>{parseInt(row.balance).toLocaleString('id-ID')}</td>
                      <td>{row.housing}</td>
                      <td>{row.month}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* --- PAGINASI --- */}
        <div className="pagination-controls">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            &laquo; Prev
          </button>
          <span>Halaman {currentPage} dari {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            Next &raquo;
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;