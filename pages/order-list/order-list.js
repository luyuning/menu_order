Page({
  data: {
    orders: [],
    page: 1,
    hasMore: true,
    isLoading: false
  },

  onLoad() {
    this.loadOrders()
  },

  refreshOrders() {
    this.setData({ orders: [], page: 1, hasMore: true })
    this.loadOrders(true)
  },

  onPullDownRefresh() {
    this.refreshOrders()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) this.loadOrders()
  },

  loadOrders(isRefresh = false) {
    if (this.data.isLoading) return
    this.setData({ isLoading: true })
    if (!isRefresh) wx.showLoading({ title: '加载中...' })

    const offset = isRefresh ? 0 : (this.data.page - 1) * 20

    wx.request({
      url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_order_items',
      data: {
        select: 'order_id,create_time,dish_name,order_date',
        order: 'create_time.desc',
        limit: 20,
        offset
      },
      header: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4'
      },
      success: res => {
        if (res.statusCode !== 200 || !res.data) return wx.showToast({ title: '加载失败', icon: 'error' })

        const items = res.data
        if (!Array.isArray(items) || items.length === 0) {
          this.setData({ hasMore: false })
          if (isRefresh) this.setData({ orders: [] })
          return
        }

        const merged = new Map()
        if (!isRefresh && this.data.orders.length > 0) {
          this.data.orders.forEach(o => {
            merged.set(o.order_id, { ...o, dish_names: o.dish_names ? [...o.dish_names] : [], expanded: !!o.expanded })
          })
        }

        items.forEach(row => {
          const id = row.order_id
          if (!merged.has(id)) merged.set(id, {
            order_id: id,
            create_time: row.create_time || '',
            order_date: row.order_date ? row.order_date.split('T')[0] : '',
            dish_names: [],
            expanded: false
          })
          const entry = merged.get(id)
          if (row.dish_name) entry.dish_names.push(row.dish_name)
        })

        const newOrders = Array.from(merged.values()).map(o => ({
          ...o,
          dish_preview: o.dish_names.slice(0, 3),
          dish_tail: o.dish_names.slice(3)
        }))

        this.setData({
          orders: newOrders,
          page: isRefresh ? 2 : this.data.page + 1,
          hasMore: items.length === 20
        })
      },
      fail: () => wx.showToast({ title: '网络错误', icon: 'error' }),
      complete: () => {
        this.setData({ isLoading: false })
        wx.hideLoading()
      }
    })
  },

  toggleExpand(e) {
    const idx = e.currentTarget?.dataset?.index ?? -1
    if (idx < 0) return
    const key = `orders[${idx}].expanded`
    const expanded = !!this.data.orders[idx]?.expanded
    this.setData({ [key]: !expanded })
  },

  formatTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d)) return ''
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }
})
