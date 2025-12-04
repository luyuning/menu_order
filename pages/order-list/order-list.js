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

  onPullDownRefresh() {
    this.setData({ page: 1, orders: [], hasMore: true })
    this.loadOrders(true).finally(() => wx.stopPullDownRefresh())
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
        offset: offset
      },
      header: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4'
      },
      success: (res) => {
        if (res.statusCode !== 200 || !res.data) {
          wx.showToast({ title: '加载失败', icon: 'error' })
          return
        }

        const items = res.data
        if (!Array.isArray(items) || items.length === 0) {
          this.setData({
            orders: [],
            hasMore: false
          })
          return
        }

        const merged = new Map()

        // 保留旧数据（展开状态、已合并菜品）
        if (!isRefresh && this.data.orders.length > 0) {
          this.data.orders.forEach(o => {
            merged.set(o.order_id, {
              order_id: o.order_id,
              create_time: o.create_time,
              order_date: o.order_date || '',
              dish_names: Array.isArray(o.dish_names) ? [...o.dish_names] : [],
              expanded: !!o.expanded
            })
          })
        }

        // 合并本次数据
        items.forEach(row => {
          const id = row.order_id
          if (!merged.has(id)) {
            merged.set(id, {
              order_id: id,
              create_time: row.create_time || '',
              order_date: row.order_date ? row.order_date.split('T')[0] : '',
              dish_names: [],
              expanded: false
            })
          }
          const entry = merged.get(id)
          if (row.dish_name) entry.dish_names.push(row.dish_name)
          if (row.create_time) entry.create_time = row.create_time
          if (row.order_date && !entry.order_date) {
            entry.order_date = row.order_date.split('T')[0]
          }
        })

        // 生成最终数组 + 预计算字段
        const newOrders = Array.from(merged.values()).map(o => {
          const names = o.dish_names || []
          return {
            order_id: o.order_id,
            create_time: o.create_time,
            order_date: o.order_date || '',
            dish_names: names,
            dish_preview: names.slice(0, 3),
            dish_tail: names.slice(3),
            expanded: !!o.expanded
          }
        })

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