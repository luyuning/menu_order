const app = getApp()

Page({
  data: {
    fullDishList: [],
    dishList: [],
    groupedMenu: {},
    categories: [],        // ← 这里以后永远是我们定义好的顺序
    currentCat: '',
    cartCount: 0,
    searchQuery: '',
    searchTimer: null,

    // 新增：我们人为规定的分类顺序（改顺序只改这里就行）
    categoryOrder: ['荤菜', '素菜', '主食', '汤水']
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
        // const list = raw.map(item => Object.assign({}, item, {
        //   id: item.id != null ? item.id : (item._id || item.uuid || (Math.random() * 1e9 | 0)),
        //   showIngredients: false,
        //   showMethod: false
        // }))




        const list = raw.map(item => {
          const obj = Object.assign({}, item, {
            id: item.id != null ? item.id : (item._id || item.uuid || (Math.random() * 1e9 | 0)),
            showIngredients: false,
            showMethod: false
          })
        
          // ★ 关键：提前把 cooking_method 按句号切成数组
          if (obj.cooking_method) {
            obj.methodLines = obj.cooking_method
              .split(/[\u3002\uFF0E.]/)   // 支持中文句号、英文句号
              .map(s => s.trim())
              .filter(s => s)             // 过滤空行
          } else {
            obj.methodLines = []
          }
        
          return obj
        })













        this.setData({ fullDishList: list }, () => {
          this.groupAndSet(list)   // 按自定义顺序重新分组+排序
          wx.hideLoading()
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误，拉取失败', icon: 'error' })
      }
    })
  },

  // 核心修改：按 categoryOrder 强制排序
  groupAndSet(list) {
    const grouped = {}
    const orderMap = {}
    this.data.categoryOrder.forEach((cat, idx) => {
      orderMap[cat] = idx           // 用于后面排序
      grouped[cat] = []             // 先占位，确保顺序里有的分类一定存在（即使暂时没菜）
    })

    // 把所有菜品归类
    list.forEach(d => {
      const cat = d.category || '其他'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(d)
    })

    // 取出我们希望的顺序（包含“其他”分类也会被排到最后）
    const orderedCats = this.data.categoryOrder.concat(
      Object.keys(grouped).filter(cat => !this.data.categoryOrder.includes(cat))
    )

    // 当前选中分类：如果之前选中的还在，就继续；否则取第一个
    let current = this.data.currentCat
    if (!current || !orderedCats.includes(current)) {
      current = orderedCats[0] || ''
    }

    this.setData({
      dishList: list,
      groupedMenu: grouped,
      categories: orderedCats,      // ← 这里就是最终渲染顺序
      currentCat: current
    })
  },

  // 切换分类（保持不变）
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (!cat) return
    this.setData({
      currentCat: cat,
      searchQuery: ''
    })
  },

  // ========== 搜索相关（只需要把 groupAndSet 换成我们新写的即可）==========
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

    this.groupAndSet(filtered)   // 搜索结果也严格按我们顺序排列
  },

  // 其余代码（折叠、加购物车、更新角标等）全部保持原样不动
  // ========= 以下代码完全复制您原来的即可 =========
  toggleSection(e) {
    const idRaw = e.currentTarget.dataset.id
    const id = String(idRaw)
    const type = e.currentTarget.dataset.type
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

    const fullIdx = this.data.fullDishList.findIndex(d => String(d.id) === id)
    if (fullIdx !== -1) {
      const key = type === 'ingredients' ? 'showIngredients' : 'showMethod'
      this.setData({ [`fullDishList[${fullIdx}].${key}`]: !this.data.fullDishList[fullIdx][key] })
    }
  },

  addToCart(e) {
    const idRaw = e.currentTarget.dataset.id
    const id = String(idRaw)

    let dish = null
    const currentCatList = (this.data.groupedMenu && this.data.currentCat)
      ? this.data.groupedMenu[this.data.currentCat] || []
      : []
    dish = currentCatList.find(d => String(d.id) === id)

    if (!dish) {
      dish = this.data.fullDishList.find(d => String(d.id) === id)
    }
    if (!dish) {
      dish = this.data.dishList.find(d => String(d.id) === id)
    }

    if (!dish) {
      wx.showToast({ title: '菜品不存在', icon: 'none' })
      return
    }

    const toAdd = { ...dish, quantity: (dish.quantity || 0) + 1 }

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

  updateCartCount() {
    const cart = (app.globalData && app.globalData.cart) ? app.globalData.cart : []
    const count = cart.reduce((s, i) => s + (i.quantity || 0), 0)
    this.setData({ cartCount: count })
  },

  // 搜索输入防抖保持不变
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
  }
})