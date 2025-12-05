const app = getApp()

Page({
  data: {
    // 原始完整菜谱（从后端拉取并做备份用于搜索恢复）
    fullDishList: [],
    // 当前用于渲染的列表（搜索时使用，正常分类浏览时保持 fullDishList）
    dishList: [],
    // 按分类分好的菜单，用于页面按分类渲染 groupedMenu[currentCat]
    groupedMenu: {},
    // 所有分类
    categories: [],
    // 当前分类
    currentCat: '',
    // 购物车计数
    cartCount: 0,
    // 搜索输入
    searchQuery: '',
    // 防抖定时器 id
    searchTimer: null
  },

  onLoad() {
    this.loadMenu()
  },

  onShow() {
    this.updateCartCount()
  },

  // -------- 从 Supabase 拉菜单 --------
  loadMenu() {
    wx.showLoading({ title: '加载中...' })

    wx.request({
      url: 'https://fxmfdkzwxbxhixhtvrbq.supabase.co/rest/v1/lyn_menu',
      header: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4bWZka3p3eGJ4aGl4aHR2cmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjkxOTgsImV4cCI6MjA3OTU0NTE5OH0.DizVxySHsOZbUOhpkZVLpWDSlpYhEQeZbiH8-20f2z4'
      },
      data: {
        enabled: 'eq.true',
        select: '*',
        order: 'category.asc,id.asc'
      },
      success: res => {
        const raw = res.data || []
        const list = raw.map(item => Object.assign({}, item, {
          id: item.id != null ? item.id : (item._id || item.uuid || (Math.random() * 1e9 | 0)),
          showIngredients: false,
          showMethod: false
        }))

        this.setData({ fullDishList: list }, () => {
          this.groupAndSet(list)
          wx.hideLoading()
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误，拉取失败', icon: 'error' })
      }
    })
  },

  // 将传入 list 按 category 分组，并设置相关 data
  groupAndSet(list) {
    const grouped = {}
    list.forEach(d => {
      const cat = d.category || '其他'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(d)
    })

    const cats = Object.keys(grouped)
    const current = this.data.currentCat || (cats[0] || '')

    this.setData({
      dishList: list,
      groupedMenu: grouped,
      categories: cats,
      currentCat: current
    })
  },

  // 切换分类
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat) return
    this.setData({
      currentCat: cat,
      searchQuery: ''
    })
  },

  // ========== 搜索相关 ==========
  onSearchInput(e) {
    const q = (e.detail && e.detail.value) ? e.detail.value.trim() : ''
    this.setData({ searchQuery: q })

    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
      this.setData({ searchTimer: null })
    }
    this.data.searchTimer = setTimeout(() => {
      this.performSearch(q)
      this.setData({ searchTimer: null })
    }, 300)
  },

  onSearchConfirm(e) {
    const q = (e.detail && e.detail.value) ? e.detail.value.trim() : ''
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
      this.setData({ searchTimer: null })
    }
    this.setData({ searchQuery: q })
    this.performSearch(q)
  },

  clearSearch() {
    this.setData({ searchQuery: '' })
    this.groupAndSet(this.data.fullDishList || [])
  },

  performSearch(q) {
    const list = this.data.fullDishList || []
    if (!q) {
      this.groupAndSet(list)
      return
    }

    const lower = q.toLowerCase()
    const filtered = list.filter(item => {
      const name = (item.name || '').toString().toLowerCase()
      const ing = (item.ingredients || '').toString().toLowerCase()
      const cat = (item.category || '').toString().toLowerCase()
      const method = (item.cooking_method || item.method || '').toString().toLowerCase()
      return name.includes(lower) || ing.includes(lower) || cat.includes(lower) || method.includes(lower)
    })

    if (filtered.length === 0) {
      this.setData({
        dishList: [],
        groupedMenu: {},
        categories: [],
        currentCat: ''
      })
      return
    }

    this.groupAndSet(filtered)
    const cats = Object.keys(this.data.groupedMenu)
    this.setData({ currentCat: cats[0] || '' })
  },

  // ========== 折叠逻辑 ==========
  toggleSection(e) {
    const idRaw = e.currentTarget.dataset.id
    const id = String(idRaw)                 // 统一转字符串，防止类型不一致
    const type = e.currentTarget.dataset.type // 'ingredients' | 'method'
    const cat = this.data.currentCat
    if (!cat) return

    const list = this.data.groupedMenu[cat] || []
    const newList = list.map(item => {
      if (String(item.id) === id) {
        const copy = { ...item }
        if (type === 'ingredients') copy.showIngredients = !copy.showIngredients
        else copy.showMethod = !copy.showMethod
        return copy
      }
      return item
    })

    this.setData({ [`groupedMenu.${cat}`]: newList })

    // 同步 fullDishList（保持备份一致）
    const fullIdx = this.data.fullDishList.findIndex(d => String(d.id) === id)
    if (fullIdx !== -1) {
      const key = type === 'ingredients' ? 'showIngredients' : 'showMethod'
      this.setData({ [`fullDishList[${fullIdx}].${key}`]: !this.data.fullDishList[fullIdx][key] })
    }
  },

  // ========== 加入购物车（关键修复）==========
  addToCart(e) {
    const idRaw = e.currentTarget.dataset.id
    const id = String(idRaw)   // 统一转字符串，彻底杜绝类型问题

    let dish = null

    // 1. 优先从当前正在渲染的分类里找（最准确、最常用）
    const currentCatList = (this.data.groupedMenu && this.data.currentCat)
      ? this.data.groupedMenu[this.data.currentCat] || []
      : []
    dish = currentCatList.find(d => String(d.id) === id)

    // 2. 没找到再从完整备份里找
    if (!dish) {
      dish = this.data.fullDishList.find(d => String(d.id) === id)
    }

    // 3. 再兜底（基本不会走到这里）
    if (!dish) {
      dish = this.data.dishList.find(d => String(d.id) === id)
    }

    if (!dish) {
      wx.showToast({ title: '菜品不存在', icon: 'none' })
      return
    }

    // 深拷贝，防止污染原数据
    const toAdd = { ...dish, quantity: (dish.quantity || 0) + 1 }

    // 加入购物车（兼容 app.addToCart 方法和 globalData 两种方式）
    if (typeof app.addToCart === 'function') {
      app.addToCart(toAdd)
    } else {
      const cart = app.globalData.cart || []
      const existIdx = cart.findIndex(i => String(i.id) === id)
      if (existIdx !== -1) {
        cart[existIdx].quantity = (cart[existIdx].quantity || 0) + 1
      } else {
        cart.push(toAdd)
      }
      app.globalData.cart = cart
    }

    this.updateCartCount()
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 600 })
  },

  // 更新购物车角标
  updateCartCount() {
    const cart = (app.globalData && app.globalData.cart) ? app.globalData.cart : []
    const count = cart.reduce((s, i) => s + (i.quantity || 0), 0)
    this.setData({ cartCount: count })
  }
})