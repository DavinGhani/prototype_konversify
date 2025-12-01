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
    balance: 'all',
    search: '' 
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // --- STATE BARU: STATUS FOLLOW UP (Simulasi Database Lokal) ---
  // Format: { "ID_Nasabah": "Tertarik", "101": "Pending" }
  const [customerStatuses, setCustomerStatuses] = useState({});

  // 1. Fetch Data
  useEffect(() => {
    fetch('https://prototypekonversify-production.up.railway.app/api/customers') // http://localhost:5000
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

  // 2. Ekstrak Opsi Unik (Memoized)
  const uniqueJobs = useMemo(() => {
    const jobs = [...new Set(allCustomers.map(c => c.job))];
    return jobs.sort();
  }, [allCustomers]);

  const uniqueClusters = useMemo(() => {
    const clusters = [...new Set(allCustomers.map(c => c.cluster_label))];
    return clusters.sort();
  }, [allCustomers]);

  const uniqueBalances = useMemo(() => {
    const balances = [...new Set(allCustomers.map(c => c.balance))];
    return balances.sort(); 
  }, [allCustomers]);

  // 3. Logika Filter
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(customer => {
      if (filters.cluster !== 'all' && customer.cluster_label !== filters.cluster) return false;
      if (filters.job !== 'all' && customer.job !== filters.job) return false;
      if (filters.balance !== 'all' && customer.balance !== filters.balance) return false;
      
      if (filters.search !== '') {
        const searchLower = filters.search.toLowerCase();
        const matchesID = customer.ID.toString().includes(filters.search);
        const matchesName = customer.name && customer.name.toLowerCase().includes(searchLower);
        const matchesEmail = customer.email && customer.email.toLowerCase().includes(searchLower);
        if (!matchesID && !matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [allCustomers, filters]);

  // --- LOGIKA BARU: MENGHITUNG STATISTIK (SUMMARY CARDS) ---
  const stats = useMemo(() => {
    const total = filteredCustomers.length;
    
    // Hitung Hot Leads (Prediksi = Yes atau Prob > 75%)
    const hotLeads = filteredCustomers.filter(c => {
      const isYes = String(c.prediksi).toLowerCase() === 'yes' || String(c.prediksi) === '1';
      return isYes;
    }).length;

    // Hitung VIP (Saldo Tinggi) - sesuaikan string dengan kategori di data Anda
    const vip = filteredCustomers.filter(c => {
      const bal = String(c.balance).toLowerCase();
      return bal.includes('tinggi') || bal.includes('vip') || bal.includes('high');
    }).length;

    // Hitung Sisa To-Do (Status masih Pending atau belum ada)
    const todo = filteredCustomers.filter(c => {
      const status = customerStatuses[c.ID] || 'Pending';
      return status === 'Pending';
    }).length;

    return { total, hotLeads, vip, todo };
  }, [filteredCustomers, customerStatuses]);

  // 4. Sorting & Paginasi
  const processedCustomers = useMemo(() => {
    let data = [...filteredCustomers];
    if (sortConfig.key !== null) {
      data.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle Sorting Status (Kolom Baru)
        if (sortConfig.key === 'status') {
           aValue = customerStatuses[a.ID] || 'Pending';
           bValue = customerStatuses[b.ID] || 'Pending';
        }
        else if (sortConfig.key === 'probabilitas') {
           aValue = parseFloat(String(aValue).replace('%', '')) || 0;
           bValue = parseFloat(String(bValue).replace('%', '')) || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [filteredCustomers, sortConfig, customerStatuses]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); 
  };

  const requestSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc'; 
      else { setSortConfig({ key: null, direction: 'asc' }); return; }
    }
    setSortConfig({ key, direction });
  };

  // --- HANDLER BARU: UBAH STATUS ---
  const handleStatusChange = (id, newStatus) => {
    setCustomerStatuses(prev => ({
      ...prev,
      [id]: newStatus
    }));
  };

  // Helpers Tampilan
  const parseProb = (val) => parseFloat(String(val).replace('%', '')) || 0;
  
  const getProbStyle = (val) => {
    if (val >= 80) return 'prob-high';
    if (val >= 50) return 'prob-medium';
    return 'prob-low';
  };

  const getBalanceStyle = (val) => {
    const str = String(val).toLowerCase();
    if (str.includes('tinggi') || str.includes('vip') || str.includes('high')) return 'bal-high';
    if (str.includes('menengah') || str.includes('mid') || str.includes('emerging')) return 'bal-medium';
    return 'bal-low';
  };

  const formatPrediksi = (val) => (String(val).toLowerCase() === 'yes' || String(val) === '1') ? 'Yes' : 'No';

  // Helper Warna Status Dropdown
  const getStatusColor = (status) => {
    switch(status) {
      case 'Tertarik': return '#d4edda'; // Hijau muda
      case 'Dihubungi': return '#cce5ff'; // Biru muda
      case 'Menolak': return '#f8d7da'; // Merah muda
      default: return '#f8f9fa'; // Abu-abu (Pending)
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dasbor Prioritas Nasabah</h1>
      </header>
      
      <div className="container">
        
        {/* --- 1. SUMMARY CARDS BARU --- */}
        <div className="stats-container">
          <div className="stat-card">
            <h3>Total Target</h3>
            <div className="stat-number">{stats.total.toLocaleString()}</div>
            <div className="stat-desc">Nasabah terfilter</div>
          </div>
          <div className="stat-card">
            <h3>Hot Leads 🔥</h3>
            <div className="stat-number" style={{color: '#27ae60'}}>{stats.hotLeads.toLocaleString()}</div>
            <div className="stat-desc">Siap dikonversi</div>
          </div>
          <div className="stat-card">
            <h3>Potensi VIP 💎</h3>
            <div className="stat-number" style={{color: '#8e44ad'}}>{stats.vip.toLocaleString()}</div>
            <div className="stat-desc">Saldo kategori Tinggi</div>
          </div>
          <div className="stat-card">
            <h3>Sisa To-Do 📝</h3>
            <div className="stat-number" style={{color: '#e67e22'}}>{stats.todo.toLocaleString()}</div>
            <div className="stat-desc">Belum dihubungi</div>
          </div>
        </div>

        {/* --- PANEL FILTER --- */}
        <div className="filter-panel">
          <div className="filter-group">
            <label>Segmen (Cluster):</label>
            <select value={filters.cluster} onChange={(e) => handleFilterChange('cluster', e.target.value)}>
              <option value="all">Semua Segmen</option>
              {uniqueClusters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Pekerjaan:</label>
            <select value={filters.job} onChange={(e) => handleFilterChange('job', e.target.value)}>
              <option value="all">Semua Pekerjaan</option>
              {uniqueJobs.map(job => <option key={job} value={job}>{job}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Kategori Saldo:</label>
            <select value={filters.balance} onChange={(e) => handleFilterChange('balance', e.target.value)}>
              <option value="all">Semua Kategori</option>
              {uniqueBalances.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="filter-group">
             <label>Cari (ID/Nama/Email):</label>
             <input type="text" placeholder="Ketik..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
             <div className="spinner"></div>
             <p>Memuat 15.000 data nasabah...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="customer-table">
              <thead>
                <tr>
                  <th className="sticky-col first-col">No</th>
                  <th className="sticky-col second-col">Nama Lengkap</th>
                  
                  {/* KOLOM AKSI/STATUS BARU */}
                  <th 
                    className="sticky-col third-col"
                    onClick={() => requestSort('status')}
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '140px', zIndex: 7 }}
                  >
                    Status Follow-up 
                    {sortConfig.key === 'status' ? (sortConfig.direction === 'desc' ? ' 🔽' : ' 🔼') : ' ↕️'}
                  </th>

                  <th>ID</th>
                  <th>Email</th>
                  <th>No. HP</th>
                  <th style={{minWidth: '200px'}}>Alamat</th>
                  <th>Pekerjaan</th>
                  <th>Saldo (Kategori)</th>
                  <th>KPR</th>

                  <th>Segmen (Cluster)</th>
                  <th>Prediksi</th>
                  
                  <th 
                    onClick={() => requestSort('probabilitas')}
                    style={{ 
                      cursor: 'pointer', 
                      userSelect: 'none', 
                      backgroundColor: sortConfig.key === 'probabilitas' ? '#e9ecef' : '',
                      minWidth: '130px'
                    }}
                  >
                    Probabilitas 
                    {sortConfig.key === 'probabilitas' ? (sortConfig.direction === 'desc' ? ' 🔼' : ' 🔽') : ' ↕️'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((row, index) => {
                  const probValue = parseProb(row.probabilitas);
                  const isPotential = formatPrediksi(row.prediksi) === 'Yes';
                  const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  
                  // Ambil status saat ini dari state, default 'Pending'
                  const currentStatus = customerStatuses[row.ID] || 'Pending';

                  return (
                    <tr key={index}>
                      <td className="sticky-col first-col">{rowNumber}</td>
                      <td className="sticky-col second-col" style={{fontWeight: '600', color: '#2c3e50'}}>
                        {row.name}
                      </td>

                      {/* --- INPUT STATUS BARU --- */}
                      <td className="sticky-col third-col" style={{backgroundColor: getStatusColor(currentStatus)}}>
                        <select 
                          value={currentStatus} 
                          onChange={(e) => handleStatusChange(row.ID, e.target.value)}
                          style={{
                            padding: '5px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc', 
                            width: '100%',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Pending">⚪ Pending</option>
                          <option value="Dihubungi">🔵 Dihubungi</option>
                          <option value="Tertarik">🟢 Tertarik</option>
                          <option value="Menolak">🔴 Menolak</option>
                        </select>
                      </td>

                      <td style={{color: '#7f8c8d', fontSize: '0.85rem'}}>#{row.ID}</td>
                      <td style={{fontSize: '0.85rem', color: '#555'}}>{row.email}</td>
                      <td style={{fontSize: '0.85rem', whiteSpace: 'nowrap'}}>{row.phone}</td>
                      <td style={{fontSize: '0.85rem', color: '#666'}}>{row.address}</td>
                      <td>{row.job}</td>
                      <td>
                        <span className={`balance-badge ${getBalanceStyle(row.balance)}`}>
                          {row.balance}
                        </span>
                      </td>
                      <td>{row.housing}</td>

                      <td><span className={`cluster-tag cluster-${row.cluster}`}>{row.cluster_label}</span></td>
                      <td style={{fontWeight: 'bold', color: isPotential ? '#27ae60' : '#95a5a6'}}>{formatPrediksi(row.prediksi)}</td>
                      <td><span className={`prob-badge ${getProbStyle(probValue)}`}>{probValue}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-controls">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&laquo; Prev</button>
          <span>Halaman {currentPage} dari {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next &raquo;</button>
        </div>

      </div>
    </div>
  );
}

export default App;