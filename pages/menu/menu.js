// pages/menu/menu.js   ← 加上分类切换，完美！
Page({
  data: {
    dishList: [],        // 所有菜品（原始数据）
    currentTab: '招牌菜' // 当前选中的分类，默认显示招牌菜
  },

  onLoad() {
    wx.showLoading({ title: '加载菜单中...' })

    wx.request({
      url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_menu',
      header: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4'
      },
      success: (res) => {
        console.log('从数据库拉到的菜：', res.data)
        this.setData({
          dishList: res.data
        })
        wx.hideLoading()
        wx.showToast({ title: '菜单加载成功', icon: 'success' })
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '网络出错', icon: 'none' })
        console.error(err)
      }
    })
  },

  // 关键：切换分类
  switchTab(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentTab: category
    })
  },

  // 加购（等你后面做购物车）
  addToCart(e) {
    const id = e.currentTarget.dataset.id
    const dish = this.data.dishList.find(item => item.id === id)
    if (!dish) return
    
    // 调用全局的加入购物车
    getApp().addToCart(dish)
  }
})