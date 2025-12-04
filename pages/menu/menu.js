const app = getApp()

Page({
  data: {
    // 原始完整菜谱（从后端拉取并做备份用于搜索恢复）
    fullDishList: [],
    // 当前用于渲染的列表（可能是搜索结果或全部）
    dishList: [],
    // 按分类分好的菜单，用于页面按分类渲染 groupedMenu[currentCat]
    groupedMenu: {},
    // 所有分类
    categories: [],
    // 当前分类（render 时使用 groupedMenu[currentCat]）
    currentCat: '',
    // 购物车计数
    cartCount: 0,
    // 搜索输入
    searchQuery: '',
    // 防抖定时器 id 存在 data 中便于清理
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
        // 我保留了你之前代码里的 key（如果要换成后端代理，把这里替换为你的代理地址）
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
        // 规范化每条记录：保证有 id，增加 UI 控制字段
        const list = raw.map(item => Object.assign({}, item, {
          // 避免 undefined，保证 id 类型一致（保留原始类型）
          id: item.id != null ? item.id : (item._id || item.uuid || (Math.random()*1e9|0)),
          showIngredients: false,
          showMethod: false
        }))

        // 保存 full 数据，默认显示全部
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

  // 将传入 list 按 category 分组，并设置 groupedMenu / categories / currentCat / dishList
  groupAndSet(list) {
    const grouped = {}
    list.forEach(d => {
      const cat = d.category || '其他'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(d)
    })

    const cats = Object.keys(grouped)
    // 保证至少有一个分类
    const current = this.data.currentCat || (cats[0] || '')

    this.setData({
      dishList: list,
      groupedMenu: grouped,
      categories: cats,
      currentCat: current
    })
  },

  // 切分类（点击顶部 tabs）
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat) return
    // 切分类时清空搜索（按你的期望）
    this.setData({
      currentCat: cat,
      searchQuery: ''
    })
    // 如果切到某个分类，dishList 仍保持 fullDishList（页面渲染根据 groupedMenu[currentCat]）
  },

  // ========== 搜索相关（防抖 + 模糊匹配 name / ingredients / cooking_method / category） ==========
  onSearchInput(e) {
    const q = (e.detail && e.detail.value) ? e.detail.value.trim() : ''
    this.setData({ searchQuery: q })

    // 防抖 300ms
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
      // 为空：恢复全部
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

    // 分组并设置，为保证渲染按“全部”展示，currentCat 设为第一个分类（或空）
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
    // 搜索后自动切回第一个分类（通常是匹配到的第一个分类）
    const cats = Object.keys(this.data.groupedMenu)
    this.setData({ currentCat: cats[0] || '' })
  },

  // ========== 折叠逻辑：修改 groupedMenu（页面渲染正是用 groupedMenu[currentCat]） ==========
  toggleSection(e) {
    const idRaw = e.currentTarget.dataset.id
    const idNum = Number(idRaw)
    const id = isNaN(idNum) ? idRaw : idNum
    const type = e.currentTarget.dataset.type // 'ingredients' | 'method'
    const cat = this.data.currentCat
    if (!cat) return

    const list = this.data.groupedMenu[cat] || []
    const newList = list.map(item => {
      if (item.id === id) {
        const copy = Object.assign({}, item)
        if (type === 'ingredients') copy.showIngredients = !copy.showIngredients
        else copy.showMethod = !copy.showMethod
        return copy
      }
      return item
    })

    // 更新 groupedMenu 对应分类，触发 UI 刷新
    this.setData({ [`groupedMenu.${cat}`]: newList })

    // 同步更新 fullDishList/dishList 中对应项，保持数据一致（方便 addToCart 等按 id 查找）
    const idx = this.data.dishList.findIndex(d => d.id === id)
    if (idx !== -1) {
      const key = type === 'ingredients' ? 'showIngredients' : 'showMethod'
      this.setData({ [`dishList[${idx}].${key}`]: !this.data.dishList[idx][key] })
      // fullDishList 也同步（保持备份一致）
      const fullIdx = this.data.fullDishList.findIndex(d => d.id === id)
      if (fullIdx !== -1) {
        this.setData({ [`fullDishList[${fullIdx}].${key}`]: !this.data.fullDishList[fullIdx][key] })
      }
    }
  },

  // ========== 加入购物车：注意 WXML 应传 data-id="{{item.id}}" ==========
  addToCart(e) {
    const idRaw = e.currentTarget.dataset.id
    const idNum = Number(idRaw)
    const id = isNaN(idNum) ? idRaw : idNum

    // 优先从 dishList 找（当前渲染或搜索结果），回退到 fullDishList
    let dish = this.data.dishList.find(d => d.id === id) || this.data.fullDishList.find(d => d.id === id)
    if (!dish) {
      wx.showToast({ title: '菜品不存在', icon: 'none' })
      return
    }

    // 深拷贝，确保不会直接修改原数据引用
    const toAdd = Object.assign({}, dish)
    if (!toAdd.quantity) toAdd.quantity = 1

    // 使用 app.addToCart 或直接写入 globalData（兼容处理）
    if (typeof app.addToCart === 'function') {
      app.addToCart(toAdd)
    } else {
      const cart = app.globalData.cart || []
      // 简单合并逻辑：若已存在则累加数量（按 id）
      const existIdx = cart.findIndex(i => i.id === toAdd.id)
      if (existIdx !== -1) {
        cart[existIdx].quantity = (cart[existIdx].quantity || 0) + (toAdd.quantity || 1)
      } else {
        cart.push(toAdd)
      }
      app.globalData.cart = cart
    }

    this.updateCartCount()
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 600 })
  },

  // 读取全局 cart，更新小红点数字
  updateCartCount() {
    const cart = (app.globalData && app.globalData.cart) ? app.globalData.cart : []
    const count = cart.reduce((s, i) => s + (i.quantity || 0), 0)
    this.setData({ cartCount: count })
  }
})
