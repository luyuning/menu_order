// pages/menu/menu.js   ← 直接全选替换，别改一行！
const app = getApp()

Page({
  data: {
    dishList: []
  },

  onLoad() {
    this.loadMenu()
  },

  onShow() {
    this.loadMenu()  // 每次进来都刷新
    app.updateCartBadge && app.updateCartBadge()
  },

  // 一行 wx.request 拉全部菜品（最简单粗暴）
  loadMenu() {
    wx.showLoading({ title: '加载菜单...' })
    
    wx.request({
      url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_menu',
      header: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4'
      },
      data: {
        enabled: 'eq.true',
        select: '*',
        order: 'id.asc'
      },
      success: (res) => {
        const list = res.data.map(item => ({
          ...item,
          showIngredients: false,
          showMethod: false
        }))
        this.setData({ dishList: list })
        wx.hideLoading()
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '网络开小差了', icon: 'error' })
        console.error(err)
      }
    })
  },

  toggleSection(e) {
    const { index, type } = e.currentTarget.dataset
    const key = type === 'ingredients' ? 'showIngredients' : 'showMethod'
    const current = this.data.dishList[index][key]
    this.setData({ [`dishList[${index}].${key}`]: !current })
  },

  addToCart(e) {
    const dish = e.currentTarget.dataset.item
    app.addToCart(dish)
  },

  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] })
  }
})