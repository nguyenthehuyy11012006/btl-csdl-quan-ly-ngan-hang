const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fhbank', {
  database: {
    check: () => ipcRenderer.invoke('database:check'),
  },
  customers: {
    search: (term) => ipcRenderer.invoke('customers:search', term),
    accounts: (customerId) => ipcRenderer.invoke('customers:accounts', customerId),
  },
  accounts: {
    openingOptions: () => ipcRenderer.invoke('accounts:opening-options'),
    open: (input) => ipcRenderer.invoke('accounts:open', input),
  },
  creditAccounts: {
    list: () => ipcRenderer.invoke('credit-accounts:list'),
  },
  deposits: {
    topCustomers: () => ipcRenderer.invoke('deposits:top-customers'),
  },
  transactions: {
    entryOptions: () => ipcRenderer.invoke('transactions:entry-options'),
    record: (input) => ipcRenderer.invoke('transactions:record', input),
    byDateRange: (range) => ipcRenderer.invoke('transactions:by-date-range', range),
    history: (filters) => ipcRenderer.invoke('transactions:history', filters),
  },
  reports: {
    spendingDebt: () => ipcRenderer.invoke('reports:spending-debt'),
    employeeIncome: () => ipcRenderer.invoke('reports:employee-income'),
    employeeRanking: (period) => ipcRenderer.invoke('reports:employee-ranking', period),
  },
  employees: {
    list: () => ipcRenderer.invoke('employees:list'),
    save: (input) => ipcRenderer.invoke('employees:save', input),
  },
  dashboard: {
    summary: () => ipcRenderer.invoke('dashboard:summary'),
  },
  customerAnalytics: {
    growth: () => ipcRenderer.invoke('customers:growth'),
    cities: () => ipcRenderer.invoke('customers:cities'),
  },
  accountAdmin: {
    limitAlerts: (threshold) => ipcRenderer.invoke('accounts:limit-alerts', threshold),
    activity: (months) => ipcRenderer.invoke('accounts:activity', months),
    changeStatus: (input) => ipcRenderer.invoke('accounts:change-status', input),
  },
})
