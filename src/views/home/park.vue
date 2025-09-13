<template>
  <!-- 科技风开屏加载动画 -->
  <div class="tech-splash-screen" v-if="showSplash">
    <div class="tech-splash-content">
      <div class="tech-logo-container">
        <div class="tech-logo">
          <div class="hexagon"></div>
          <div class="hexagon"></div>
          <div class="hexagon"></div>
          <div class="tech-logo-text">中亿智慧园区数字孪生系统</div>
        </div>
      </div>

      <div class="tech-progress-container">
        <div class="tech-progress-bar">
          <div
            class="tech-progress-fill"
            :style="{ width: Math.min(splashProgress, 100) + '%' }"
          >
            <div class="tech-progress-light"></div>
          </div>
        </div>
        <div class="tech-progress-text">
          系统初始化中... {{ Math.min(splashProgress, 100) }}%
        </div>
      </div>

      <div class="tech-loading-tips">
        <div
          class="tech-tip-item"
          v-for="(tip, index) in loadingTips"
          :key="index"
        >
          <div class="tech-tip-icon">▶</div>
          <div class="tech-tip-text">{{ tip }}</div>
        </div>
      </div>

      <div class="tech-bottom-info">
        <div class="tech-version">Version 1.0.0</div>
        <div class="tech-copyright">© 2025 中亿集团</div>
      </div>
    </div>

    <div class="tech-particles">
      <div
        class="particle"
        v-for="(particle, index) in particles"
        :key="index"
        :style="{
          left: particle.x + 'px',
          top: particle.y + 'px',
          width: particle.size + 'px',
          height: particle.size + 'px',
          opacity: particle.opacity,
          animationDelay: particle.delay + 's'
        }"
      ></div>
    </div>
  </div>

  <!-- 主内容 -->
  <div id="main-content" v-show="!showSplash">
    <!-- <div id="jindu-text-con" v-if="progressBarShow">
      正在加载模型请稍等：<span id="jindu-text">{{ progressText }}</span>
      <div class="jindu-con">
        <div id="jindu" :style="{ width: progressText }"></div>
      </div>
    </div> -->
    <video id="videoContainer"></video>
    <div id="container" ref="container"></div>

    <!-- 左侧数据看板 -->
    <div class="data-panel left-panel">
      <div class="panel-header">园区数据概览</div>
      <div class="panel-content">
        <div class="data-item">
          <div class="data-title">建筑总数</div>
          <div class="data-value">{{ buildingCount }}</div>
        </div>
        <div class="data-item">
          <div class="data-title">人员数量</div>
          <div class="data-value">{{ peopleCount }}</div>
        </div>
        <div class="data-item">
          <div class="data-title">能耗(kWh)</div>
          <div class="data-value">{{ energyConsumption }}</div>
        </div>
        <div class="data-item">
          <div class="data-title">安防状态</div>
          <div class="data-value" :class="securityStatus">
            {{ securityStatusText }}
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧数据看板 -->
    <div class="data-panel right-panel">
      <div class="panel-header">当前建筑信息</div>
      <div class="panel-content">
        <div class="info-item" v-if="selectedBuilding">
          <div class="info-title">建筑名称</div>
          <div class="info-value">{{ selectedBuilding.name }}</div>
        </div>
        <div class="info-item" v-if="selectedBuilding">
          <div class="info-title">建筑面积</div>
          <div class="info-value">{{ selectedBuilding.area }}㎡</div>
        </div>
        <div class="info-item" v-if="selectedBuilding">
          <div class="info-title">使用状态</div>
          <div class="info-value">{{ selectedBuilding.status }}</div>
        </div>
        <div class="info-item" v-if="selectedBuilding">
          <div class="info-title">实时能耗</div>
          <div class="info-value">{{ selectedBuilding.energy }}kWh</div>
        </div>
        <div class="chart-container" v-if="selectedBuilding">
          <div id="energyChart" style="width: 100%; height: 150px"></div>
        </div>
      </div>
    </div>

    <!-- 2D地图容器 -->
    <div id="map-2d" ref="map2d"></div>

    <!-- 操作按钮 -->
    <div class="operate-box">
      <el-button type="warning" @click="onReset">场景重置</el-button>
      <el-button type="warning" @click="onChangeTime">{{ timeText }}</el-button>
      <el-button type="warning" @click="toggleMap">{{
        show2DMap ? '隐藏2D地图' : '显示2D地图'
      }}</el-button>
    </div>
  </div>
</template>
  
  <script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as THREE from 'three'
import Viewer from '@/common/threeModules/Viewer'
import SkyBoxs from '@/common/threeModules/SkyBoxs'
import Lights from '@/common/threeModules/Lights'
import ModelLoader from '@/common/threeModules/ModelLoader'
import Labels from '@/common/threeModules/Labels'
import { Water } from 'three/examples/jsm/objects/Water2'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as echarts from 'echarts'
import gsap from 'gsap'

// 科技风开屏加载状态
const showSplash = ref(true)
const splashProgress = ref(0)
const loadingTips = ref([
  '正在初始化3D渲染引擎...',
  '加载园区基础模型...',
  '构建物理碰撞系统...',
  '初始化数据接口...',
  '准备可视化组件...'
])
const particles = ref([])

// 创建粒子效果
const createParticles = () => {
  const count = 50
  for (let i = 0; i < count; i++) {
    particles.value.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 5 + 2,
      opacity: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 5
    })
  }
}

// 3D场景相关变量
let viewer = null
let cityv1 = null
let car = null
let carLabel = null
let officeLabel = null
let officeBuild = null
let oldOfficeBuild = {}
let curve = null
let Mesh26 = null
let timeen = {}
let modelLoader = null
let labelIns = null
let laboratoryBuild = {}
let videoTextTure = null
let curFloorName = ''
let modelMoveName = ''
let selectedFloorName = ''
let isSplit = false
let lastIndex
let skyBoxs = null
const sceneList = ['实验楼']
const TimeNums = {
  day: '白天模式',
  night: '夜间模式'
}

// 2D地图相关
const map2d = ref(null)
const mapInstance = ref(null)
const show2DMap = ref(true)

// 数据看板相关
const buildingCount = ref(5)
const peopleCount = ref(126)
const energyConsumption = ref(4528)
const securityStatus = ref('normal')
const securityStatusText = ref('正常')
const selectedBuilding = ref(null)

// 其他状态
let progress = 0
const velocity = 0.001
const officeFloorList = Array(6)
  .fill(0)
  .map((item, index) => `zuo${index}`)
const isopen = ref(false)
const progressText = ref('0%')
const progressBarShow = ref(true)
const isDriver = ref(false)
const timeText = ref(TimeNums.night)

onMounted(() => {
  createParticles()
  init()
})

const init = () => {
  viewer = new Viewer('container')
  skyBoxs = new SkyBoxs(viewer)
  //   viewer.camera.position.set(17, 10, 52)
  // 优化初始视角位置，提供更好的园区概览视角
  viewer.camera.position.set(30, 25, 72)
  viewer.controls.maxPolarAngle = Math.PI / 2.1

  // 设置相机距离限制，实现缩放限制
  viewer.controls.minDistance = 5 // 最小距离(限制最大放大)
  viewer.controls.maxDistance = 100 // 最大距离(限制最小缩小)

  // 设置初始看向场景中心点
  viewer.controls.target.set(0, 0, 0)

  // 可选：设置阻尼效果，让视角控制更平滑
  viewer.controls.enableDamping = true
  viewer.controls.dampingFactor = 0.05

  viewer.renderer.shadowMap.enabled = true
  viewer.renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const lights = new Lights(viewer)
  const ambientLight = lights.addAmbientLight()
  ambientLight.setOption({
    color: 0xffffff,
    intensity: 1
  })
  ambientLight.light.name = 'AmbientLight'

  lights.addDirectionalLight([100, 100, -10], {
    color: 'rgb(253,253,253)',
    intensity: 3,
    castShadow: true
  })

  const spotLights = new THREE.Group()
  spotLights.name = 'SpotLights'
  spotLights.add(initSpotLight(10, 32, -30))
  spotLights.add(initSpotLight(-2.5, 32, -30))
  spotLights.add(initSpotLight(-15, 32, -30))
  spotLights.add(initSpotLight(22.5, 32, -30))
  viewer.scene.add(spotLights)

  // 初始化模型加载器
  modelLoader = new ModelLoader(viewer)

  // 初始化标签系统
  labelIns = new Labels(viewer)

  // 加载所有模型
  loadAllModels().then(() => {
    // 所有模型加载完成后，延迟500ms隐藏开屏页面
    setTimeout(() => {
      showSplash.value = false
      nextTick(() => {
        init2DMap()
        initDataPanel()
      })
    }, 500)
  })
}

// 加载所有模型
const loadAllModels = async () => {
  try {
    // 初始化视频纹理
    initVideoTexture()

    // 并行加载基础模型
    await Promise.all([
      loadCar(),
      initFence(),
      loadOfficeBuild(),
      loadLaboratoryBuild()
    ])

    // 加载其他模型
    await Promise.all([
      loadBillBoard(),
      loadPeople(),
      loadLamp(),
      loadTree(),
      loadSwimmingPool()
    ])

    // 初始化交互
    officeMouseMove()
    officeFloorClick()

    // 添加轴和统计信息
    // viewer.addAxis()
    // viewer.addStats()

    // 添加缩放事件监听
    setupScaleControls()
    // 模型加载完成后，默认显示办公大楼信息
    setTimeout(() => {
      selectBuilding({
        name: '办公大楼',
        area: '12,000',
        status: '使用中',
        energy: '1,250'
      })
    }, 1000)
  } catch (error) {
    console.error('模型加载失败:', error)
  }
}

// 设置缩放控制
const setupScaleControls = () => {
  // 监听鼠标滚轮事件
  viewer.renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault()

    // 限制整体视图缩放范围
    const currentDistance = viewer.camera.position.distanceTo(
      viewer.controls.target
    )

    // 计算缩放因子
    const scaleFactor = event.deltaY > 0 ? 1.1 : 0.9
    const newDistance = currentDistance * scaleFactor

    // 应用缩放限制
    if (
      newDistance >= viewer.controls.minDistance &&
      newDistance <= viewer.controls.maxDistance
    ) {
      viewer.camera.position.multiplyScalar(scaleFactor)
    }
  })
}

// 初始化2D地图
const init2DMap = () => {
  mapInstance.value = L.map(map2d.value, {
    attributionControl: false,
    zoomControl: false
  }).setView([39.9042, 116.4074], 18)

  // 添加园区平面图底图
  L.imageOverlay(
    '/images/campus-map.png',
    [
      [39.9035, 116.4065],
      [39.905, 116.4085]
    ],
    {
      opacity: 1,
      interactive: true
    }
  ).addTo(mapInstance.value)

  // 添加建筑标记
  add2DBuildings()

  // 初始化联动事件
  initMapLinkage()
}

// 添加2D建筑标记
const add2DBuildings = () => {
  // 办公大楼
  const officeBounds = [
    [39.904, 116.407],
    [39.9045, 116.4075]
  ]
  const officeMarker = L.rectangle(officeBounds, {
    color: '#3388ff',
    weight: 2,
    fillOpacity: 0.3
  }).addTo(mapInstance.value)
  officeMarker.bindPopup('办公大楼')
  officeMarker._id = 'officeBuild'
  officeMarker.on('click', () => {
    selectBuilding({
      name: '办公大楼',
      area: '12,000',
      status: '使用中',
      energy: '1,250'
    })
  })

  // 实验楼
  const labBounds = [
    [39.9038, 116.408],
    [39.9042, 116.4085]
  ]
  const labMarker = L.rectangle(labBounds, {
    color: '#ff7800',
    weight: 2,
    fillOpacity: 0.3
  }).addTo(mapInstance.value)
  labMarker.bindPopup('实验楼')
  labMarker._id = 'laboratoryBuild'
  labMarker.on('click', () => {
    selectBuilding({
      name: '实验楼',
      area: '8,500',
      status: '使用中',
      energy: '980'
    })
  })
}

// 初始化数据看板
const initDataPanel = () => {
  // 模拟数据更新
  setInterval(() => {
    peopleCount.value += Math.floor(Math.random() * 5 - 2)
    energyConsumption.value += Math.floor(Math.random() * 10)
  }, 5000)
}

// 选择建筑更新数据看板
const selectBuilding = (building) => {
  selectedBuilding.value = building
  // updateEnergyChart()
  nextTick(() => {
    updateEnergyChart()
  })

  // 在3D场景中找到对应建筑并高亮
  const building3D = viewer.scene.getObjectByName(building.name)
  if (building3D) {
    highlightBuilding3D(building3D)
  }
}

// 更新能耗图表
const updateEnergyChart = () => {
  const chartDom = document.getElementById('energyChart')
  if (!chartDom) return
  // 确保DOM元素已经渲染完成
  if (chartDom.clientWidth === 0 || chartDom.clientHeight === 0) {
    console.warn('Chart container not ready, retrying...')
    setTimeout(updateEnergyChart, 100)
    return
  }
  const chart = echarts.init(chartDom)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
    },
    yAxis: {
      type: 'value',
      name: 'kWh'
    },
    series: [
      {
        data: [320, 280, 350, 420, 380, 300],
        type: 'line',
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#409EFF'
        },
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)

  // 窗口大小变化时重新调整图表大小
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 初始化2D与3D联动
const initMapLinkage = () => {
  // 2D地图点击事件
  mapInstance.value.on('click', (e) => {
    const feature = e.layer
    if (feature && feature._id) {
      // 在3D场景中找到对应建筑
      const building3D = viewer.scene.getObjectByName(feature._id)
      if (building3D) {
        // 聚焦到3D建筑
        focusOnBuilding3D(building3D)

        // 更新数据看板
        if (feature._id === 'officeBuild') {
          selectBuilding({
            name: '办公大楼',
            area: '12,000',
            status: '使用中',
            energy: '1,250'
          })
        } else if (feature._id === 'laboratoryBuild') {
          selectBuilding({
            name: '实验楼',
            area: '8,500',
            status: '使用中',
            energy: '980'
          })
        }
      }
    }
  })

  // 3D场景点击事件转发到2D
  viewer.renderer.domElement.addEventListener('click', (e) => {
    const intersects = getIntersects(e)
    if (intersects.length > 0) {
      const object3D = intersects[0].object.parent
      if (object3D && object3D.name) {
        // 在2D地图中找到对应元素
        highlight2DFeature(object3D.name)

        // 更新数据看板
        if (object3D.name === '办公大厅') {
          selectBuilding({
            name: '办公大楼',
            area: '12,000',
            status: '使用中',
            energy: '1,250'
          })
        } else if (object3D.name === '实验楼') {
          selectBuilding({
            name: '实验楼',
            area: '8,500',
            status: '使用中',
            energy: '980'
          })
        }
      }
    }
  })
}

// 3D建筑聚焦功能
const focusOnBuilding3D = (building) => {
  const box = new THREE.Box3().setFromObject(building)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)

  const direction = new THREE.Vector3()
    .subVectors(viewer.camera.position, center)
    .normalize()

  const targetPosition = center.clone().addScaledVector(direction, maxDim * 1.5)

  gsap.to(viewer.camera.position, {
    x: targetPosition.x,
    y: targetPosition.y,
    z: targetPosition.z,
    duration: 1,
    ease: 'power1.inOut'
  })

  gsap.to(viewer.controls.target, {
    x: center.x,
    y: center.y,
    z: center.z,
    duration: 1,
    ease: 'power1.inOut'
  })
}

// 高亮3D建筑
const highlightBuilding3D = (building) => {
  // 先重置所有建筑颜色
  viewer.scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if (obj.userData.originalMaterial) {
        obj.material = obj.userData.originalMaterial
      }
    }
  })

  // 高亮选中建筑
  building.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      // 保存原始材质
      if (!obj.userData.originalMaterial) {
        obj.userData.originalMaterial = obj.material
      }

      // 应用高亮材质
      obj.material = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        specular: 0x111111,
        shininess: 30
      })
    }
  })
}

// 高亮2D要素
const highlight2DFeature = (featureId) => {
  mapInstance.value.eachLayer((layer) => {
    if (layer._id === featureId) {
      layer.setStyle({
        color: '#ff0000',
        weight: 3,
        fillOpacity: 0.5
      })
      mapInstance.value.fitBounds(layer.getBounds())
    } else if (layer.setStyle) {
      layer.setStyle({
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.3
      })
    }
  })
}

// 切换2D地图显示
const toggleMap = () => {
  show2DMap.value = !show2DMap.value
  if (map2d.value) {
    map2d.value.style.display = show2DMap.value ? 'block' : 'none'
  }
}

const onChangeTime = () => {
  const ambientLight = viewer.scene.getObjectByName('AmbientLight')
  const directionalLight = viewer.scene.getObjectByProperty(
    'type',
    'DirectionalLight'
  )
  const spotLights = viewer.scene.getObjectsByProperty('type', 'SpotLight')

  if (timeText.value === TimeNums.night) {
    skyBoxs.setSkybox('night')
    timeText.value = '白天模式'
    ambientLight.intensity = 0.3
    directionalLight.visible = false
    spotLights.forEach((spotLight) => {
      spotLight.visible = true
    })
  } else {
    skyBoxs.setSkybox('day')
    timeText.value = '夜间模式'
    ambientLight.intensity = 1.0
    directionalLight.visible = true
    spotLights.forEach((spotLight) => {
      spotLight.visible = false
    })
  }
}

/**
 * 初始化视频纹理
 */
const initVideoTexture = () => {
  const video = document.getElementById('videoContainer')
  video.src = '/video/celebration.mp4'
  video.autoplay = 'autoplay'
  video.loop = 'loop'
  video.muted = 'muted'
  videoTextTure = new THREE.VideoTexture(video)
}

/**
 * 加载聚光灯
 */
const initSpotLight = (x, y, z) => {
  const spotLightGroup = new THREE.Group()
  const spotLight = new THREE.SpotLight()
  const spotLightHelper = new THREE.SpotLightHelper(spotLight)
  spotLightGroup.add(spotLight)
  spotLightGroup.add(spotLightHelper)
  spotLightGroup.add(spotLight.target)

  spotLight.position.set(x, y, z)
  spotLight.target.position.set(x, y - 2, z - 1)
  spotLight.penumbra = 0.8

  spotLight.visible = false
  spotLightHelper.visible = false

  return spotLightGroup
}

/**
 * 加载人
 */
const loadPeople = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glb/ren.glb', (model) => {
      model.openCastShadow()
      model.object.position.set(13, 0, 15)
      model.object.name = '人'
      model.startAnimal(1)
      model.cloneModel([25, 0, 29]).startAnimal()
      resolve()
    })
  })
}

/**
 * 加载路灯
 */
const loadLamp = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glb/lightpostDouble.glb', (model) => {
      model.openCastShadow()
      model.object.position.set(23, 0, 29)
      model.object.scale.set(1, 3, 1)
      model.object.name = '路灯'
      model.cloneModel([20, 0, 29])
      model.cloneModel([17, 0, 29])
      model.cloneModel([14, 0, 29])
      model.cloneModel([9, 0, 29])
      model.cloneModel([6, 0, 29])
      resolve()
    })
  })
}

/**
 * 初始化停车场栅栏
 */
const initFence = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene(
      '/glb/city-v1.glb',
      (model) => {
        model.object.name = 'cityv1'
        model.openCastShadow()
        model.openReceiveShadow()
        model.object.children.forEach((item) => {
          if (item.name === 'Mesh26') {
            Mesh26 = item
            gsap.to(item.scale, {
              x: item.scale.x / 8,
              duration: 5,
              ease: 'power1.inOut',
              onComplete: () => {
                makeCurve()
                isopen.value = true
              }
            })
          }
        })
        timeen = {
          fun: moveOnCurve,
          content: car
        }
        viewer.addAnimate(timeen)
        cityv1 = model.object.clone()
        resolve()
      },
      (pgs) => {
        pgs = Math.floor(pgs * 100)
        progressText.value = pgs + '%'
        if (pgs === 100) {
          progressBarShow.value = false
        }
      },
      (error) => {
        console.log('----加载city-v1.glb报错---', error)
        resolve()
      }
    )
  })
}

/**
 * 加载广告牌
 */
const loadBillBoard = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glb/billboard.glb', (model) => {
      model.openCastShadow()
      model.object.position.set(4, -20, -35)
      model.object.rotateY(-Math.PI / 2)
      model.object.scale.set(2.7, 2.7, 2.7)
      model.object.name = '广告牌'
      const object6 = model.object.getObjectByName('Object_6')
      object6.material = new THREE.MeshBasicMaterial({
        map: videoTextTure,
        side: THREE.DoubleSide,
        transparent: true
      })
      resolve()
    })
  })
}

/**
 * 加载办公大厅
 */
const loadOfficeBuild = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glb/officeBuild.glb', (model) => {
      officeBuild = model
      officeBuild.openCastShadow()
      officeBuild.openReceiveShadow()
      officeBuild.object.rotation.y = Math.PI
      officeBuild.object.position.set(16, 0, -5)
      officeBuild.object.scale.set(0.2, 0.2, 0.2)
      officeBuild.object.name = '办公大厅'
      officeBuild.object.children.forEach((item) => {
        item.name = item.name.replace('zuo', '')
        if (item.name === 'ding') {
          item.name = 6
        }
        item.name--
      })
      officeBuild.object.children
        .sort((a, b) => a.name - b.name)
        .forEach((v) => {
          v.name = 'zuo' + v.name
        })
      officeBuild.forEach((child) => {
        if (child.isMesh) {
          child.frustumCulled = false
          child.material.emissive = child.material.color
          child.material.emissiveMap = child.material.map
          child.material.emissiveIntensity = 1.2
          child.material.envmap = viewer.scene.background
        }
      })
      oldOfficeBuild = officeBuild.object.clone()
      const buildBox = officeBuild.getBox()

      // 修复：添加空值检查
      if (labelIns && labelIns.addCss2dLabel) {
        officeLabel = labelIns.addCss2dLabel(
          {
            x: buildBox.max.x / 2,
            y: buildBox.max.y,
            z: buildBox.max.z
          },
          `<span class="label">${model.object.name}</span>`
        )

        if (labelIns.label) {
          gsap.to(labelIns.label.position, {
            y: buildBox.max.y + 2,
            repeat: -1,
            yoyo: true,
            duration: 2,
            ease: 'Bounce.inOut'
          })
        }
      }
      resolve()
    })
  })
}

/**
 * 办公楼鼠标移动效果
 */
const officeMouseMove = () => {
  viewer.startSelectEvent('mousemove', false, (model) => {
    if (curFloorName) {
      viewer.stopSelectEvent()
    }
    if (model.parent?.parent?.name === '办公大厅' && !isSplit) {
      officeFloorList.forEach((item) => {
        if (item === model.parent.name) {
          modelMoveName = item
          if (curFloorName === modelMoveName) {
            return
          }
          officeBuild.object.getObjectByName(item).traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshPhongMaterial({
                color: 'yellow',
                transparent: true,
                opacity: 0.8,
                emissive: child.material.color,
                emissiveMap: child.material.map,
                emissiveIntensity: 3
              })
            }
          })
        } else {
          if (!isSplit) {
            const oldModel = oldOfficeBuild.getObjectByName(item)
            officeBuild.object.getObjectByName(item)?.traverse((child) => {
              if (child.isMesh) {
                child.material = oldModel.getObjectByName(child.name).material
              }
            })
          }
        }
      })
    }
  })
}

/**
 * 办公楼点击
 */
const officeFloorClick = () => {
  viewer.renderer.domElement.addEventListener('click', (e) => {
    const rayCaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    mouse.x = (e.offsetX / viewer.renderer.domElement.clientWidth) * 2 - 1
    mouse.y = -(e.offsetY / viewer.renderer.domElement.clientHeight) * 2 + 1
    rayCaster.setFromCamera(mouse, viewer.camera)
    const intersects = rayCaster.intersectObject(viewer.scene, true)
    if (intersects.length > 0 && modelMoveName) {
      const model = intersects[0].object.parent
      if (model.name.includes('zuo')) {
        if (!isSplit) {
          carLabel.visible = false
          officeLabel.visible = false
          viewer.scene.children.find(
            (item) => item.name === '快递车'
          ).visible = false
          viewer.scene.children.find((o) => o.name == 'cityv1').visible = false
          viewer.scene.children.find((o) => o.name == '树').visible = false
          sceneList.forEach((item) => {
            viewer.scene.children
              .find((o) => o.name == item)
              .traverse((child) => {
                child.material = new THREE.MeshPhongMaterial({
                  color: new THREE.Color('rgba(7,32,96,0.76)'),
                  transparent: true,
                  opacity: 0.1,
                  wireframe: true,
                  depthWrite: true
                })
              })
          })
          gsap.to(viewer.scene.children.find((o) => o.name === '人').rotation, {
            y: Math.PI,
            duration: 2,
            ease: 'power1.inOut',
            onComplete: () => {
              isSplit = true
            }
          })
        }
        selectOffice(model)
      } else {
        if (!isSplit) {
          const oldModel = oldOfficeBuild.getObjectByName(modelMoveName)
          officeBuild.object
            .getObjectByName(modelMoveName)
            .traverse(function (child) {
              if (child.isMesh) {
                child.material = oldModel.getObjectByName(child.name).material
              }
            })
        }
      }
    }
  })
}

const selectOffice = (model) => {
  curFloorName = model.name
  const oldModel = oldOfficeBuild.getObjectByName(curFloorName)
  const modelSelectIndex = officeFloorList.findIndex(
    (item) => item === curFloorName
  )
  if (modelSelectIndex === lastIndex) return
  if (!isSplit) {
    officeBuild.object.children.forEach((child, index) => {
      if (child.name === curFloorName) {
        child.children.forEach((ol) => {
          ol.material = oldModel.getObjectByName(ol.name).material
        })
      }
      if (index > 0) {
        isSplit = true
        gsap.to(child.position, {
          y: child.position.y + index * 10,
          duration: 2,
          ease: 'power1.inOut'
        })
      }
    })
  } else {
    officeBuild.object.children.forEach((child, index) => {
      if (index === lastIndex) {
        gsap.to(child.position, {
          z: child.position.z + 40,
          duration: 2,
          ease: 'power1.inOut'
        })
      }
      if (child.name === curFloorName) {
        gsap.to(child.position, {
          z: child.position.z - 40,
          duration: 2,
          ease: 'power1.inOut',
          onComplete: () => {
            lastIndex = index
          }
        })
      }
    })
  }

  gsap.to(viewer.controls.target, {
    x: 12,
    y: 0,
    z: -5,
    duration: 2,
    ease: 'power1.inOut'
  })
}

/**
 * 加载实验楼
 */
const loadLaboratoryBuild = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glTF/laboratoryBuild.gltf', (model) => {
      const geometryArr = []
      const materialArr = []
      model.object.traverse((item) => {
        item.updateMatrixWorld(true)
        if (item.isMesh) {
          item.geometry.applyMatrix4(item.matrixWorld)
          geometryArr.push(item.geometry)
          materialArr.push(item.material)
        }
      })
      const geometryMerged = BufferGeometryUtils.mergeGeometries(
        geometryArr,
        true
      )

      const meshMerged = new THREE.Mesh(geometryMerged, materialArr)

      model.object.remove(model.object.children[0])
      model.object.add(meshMerged)

      meshMerged.castShadow = true
      meshMerged.receiveShadow = true
      model.object.rotateY(Math.PI / 2)
      model.object.position.set(-17, 0, 5)
      model.object.scale.set(0.7, 0.7, 0.7)
      model.object.name = '实验楼'

      laboratoryBuild = model.object.clone()
      const bbox = model.getBox()

      // 修复：添加空值检查
      if (labelIns && labelIns.addCss2dLabel) {
        labelIns.addCss2dLabel(
          {
            x: bbox.max.x,
            y: bbox.max.y,
            z: bbox.max.z
          },
          `<span class="label">${model.object.name}</span>`
        )

        if (labelIns.label) {
          gsap.to(labelIns.label.position, {
            y: bbox.max.y + 2,
            repeat: -1,
            yoyo: true,
            duration: 2,
            ease: 'Bounce.inOut'
          })
        }
      }
      resolve()
    })
  })
}

/**
 * 加载车辆
 */
const loadCar = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glTF/car13.gltf', (model) => {
      car = model
      model.openCastShadow()
      model.openReceiveShadow()
      model.object.position.set(11.5, 0, 18)
      model.object.scale.set(1, 1, 1)
      model.object.name = '快递车'

      const spotLight = new THREE.SpotLight()

      model.object.add(spotLight)
      model.object.add(spotLight.target)

      spotLight.angle = Math.PI / 4
      spotLight.position.set(0, 2, 2)
      spotLight.target.position.set(0, 1, 3)
      spotLight.penumbra = 0.8

      spotLight.castShadow = true
      spotLight.shadow.mapSize.width = 1024
      spotLight.shadow.mapSize.height = 1024
      spotLight.shadow.camera.near = 0.1
      spotLight.shadow.camera.far = 100
      spotLight.shadow.camera.bias = 0.005

      spotLight.visible = false

      let boxx = model.getBox()

      // 修复：添加空值检查
      if (labelIns && labelIns.addCss2dLabel) {
        carLabel = labelIns.addCss2dLabel(
          {
            x: boxx.max.x,
            y: boxx.max.y + 2,
            z: boxx.max.z
          },
          `<span class="label">${model.object.name}</span>`
        )
      }
      resolve()
    })
  })
}

/**
 * 加载树
 */
const loadTree = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene(
      'glTF/tree_animate/new-scene.gltf',
      (model) => {
        model.openCastShadow()
        model.object.position.set(8, 0, 16)
        model.object.scale.set(0.08, 0.08, 0.08)
        model.object.name = '树'
        model.startAnimal()
        resolve()
      }
    )
  })
}

/**
 * 加载水池
 */
const loadSwimmingPool = () => {
  return new Promise((resolve) => {
    modelLoader.loadModelToScene('/glb/pool.glb', (model) => {
      model.openCastShadow()
      model.openReceiveShadow()
      model.object.position.set(12, 1, -16)
      model.object.scale.set(0.6, 0.5, 0.6)
      model.object.name = '水池'

      const waterTexLoader = new THREE.TextureLoader()
      const oldWater = model.object.getObjectByName('voda_0')
      const waterMesh = new Water(oldWater.children[0].geometry, {
        textureWidth: 512,
        textureHeight: 512,
        color: 0xeeeeff,
        flowDirection: new THREE.Vector2(1, 1),
        scale: 1,
        normalMap0: waterTexLoader.load('/images/Water_1_M_Normal.jpg'),
        normalMap1: waterTexLoader.load('/images/Water_2_M_Normal.jpg')
      })
      waterMesh.name = '动态水'
      oldWater.remove(oldWater.children[0])
      oldWater.add(waterMesh)
      resolve()
    })
  })
}

/**
 * 物体沿线移动方法
 */
const moveOnCurve = (model) => {
  if (curve && car) {
    if (progress <= 1 - velocity) {
      let carObj = model.object
      let boxx = model.getBox()

      // 修复：添加空值检查
      if (carLabel) {
        carLabel.position.set(boxx.max.x, boxx.max.y + 2, boxx.max.z)
      }

      if (
        carObj.position.z.toFixed(2) >= 28.0 &&
        carObj.position.z.toFixed(2) <= 28.1
      ) {
        if (isopen.value) {
          gsap.to(Mesh26.scale, {
            x: Mesh26.scale.x * 8,
            duration: 5,
            ease: 'power1.inOut',
            onComplete: () => {
              isopen.value = false
            }
          })
        } else {
          gsap.to(Mesh26.scale, {
            x: Mesh26.scale.x / 8,
            duration: 5,
            ease: 'power1.inOut',
            onComplete: () => {
              isopen.value = true
              viewer.addAnimate(timeen)
            },
            onStart: () => {
              viewer.removeAnimate(timeen)
            }
          })
        }
      }

      const point = curve.getPointAt(progress)
      const pointBox = curve.getPointAt(progress + velocity)

      if (point && pointBox) {
        carObj.position.set(point.x, point.y, point.z)
        carObj.lookAt(pointBox.x, pointBox.y, pointBox.z)
        if (isDriver.value) {
          viewer.camera.position.set(point.x, point.y + 2, point.z)
          viewer.camera.lookAt(pointBox.x, pointBox.y + 2, pointBox.z)
        }

        const offsetAngle = 22
        const mtx = new THREE.Matrix4()
        mtx.lookAt(carObj.position, pointBox, carObj.up)
        mtx.multiply(
          new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(0, offsetAngle, 0)
          )
        )
        const toRot = new THREE.Quaternion().setFromRotationMatrix(mtx)
        carObj.quaternion.slerp(toRot, 0.2)
      }
      progress += velocity
    } else {
      progress = 0
    }
  }
}

const makeCurve = () => {
  curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(11.5, 0, 18),
    new THREE.Vector3(11.5, 0, 34),
    new THREE.Vector3(35, 0, 34),
    new THREE.Vector3(35, 0, 31),
    new THREE.Vector3(11.5, 0, 31)
  ])
  curve.curveType = 'catmullrom'
  curve.closed = true
  curve.tension = 0

  const points = curve.getPoints(0.1)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
  const curveObject = new THREE.Line(geometry, material)
  curveObject.position.y = -1
  viewer.scene.add(curveObject)
}

const onReset = () => {
  gsap.to(viewer.camera.position, {
    // x: 17,
    // y: 10,
    // z: 52,
    x: 30,
    y: 25,
    z: 72,
    duration: 2,
    ease: 'Bounce.inOut'
  })
  gsap.to(viewer.scene.children.find((o) => o.name == '人').rotation, {
    y: 0,
    duration: 2,
    ease: 'power1.inOut'
  })

  // 修复：添加空值检查
  if (carLabel) carLabel.visible = true
  if (officeLabel) officeLabel.visible = true

  viewer.scene.children.find((o) => o.name === '快递车').visible = true
  viewer.scene.children.find((o) => o.name === '树').visible = true
  viewer.scene.children.find((o) => o.name === 'cityv1').visible = true
  viewer.scene.children[
    viewer.scene.children.findIndex((o) => o.name == '实验楼')
  ] = laboratoryBuild.clone()
  viewer.scene.children[
    viewer.scene.children.findIndex((o) => o.name == '办公大厅')
  ] = officeBuild.object = oldOfficeBuild.clone()
  curFloorName = ''
  modelMoveName = null
  isSplit = false
  lastIndex = null
  selectedFloorName = ''
  officeMouseMove()
}
</script>
  
  <style lang="less" scoped>
/* 科技风开屏加载样式 */
.tech-splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  overflow: hidden;
  font-family: 'Arial', sans-serif;
  color: #fff;
}

.tech-splash-content {
  width: 80%;
  max-width: 800px;
  text-align: center;
  z-index: 2;
}

.tech-logo-container {
  margin-bottom: 40px;
}

.tech-logo {
  position: relative;
  display: inline-block;
}

.hexagon {
  position: absolute;
  width: 80px;
  height: 46.19px;
  background-color: rgba(0, 255, 255, 0.3);
  border: 2px solid #00ffff;
  transform: rotate(30deg);

  &:before,
  &:after {
    content: '';
    position: absolute;
    width: 80px;
    height: 46.19px;
    background-color: inherit;
    border: inherit;
  }

  &:before {
    transform: rotate(60deg);
  }

  &:after {
    transform: rotate(-60deg);
  }

  &:nth-child(1) {
    top: 0;
    left: 0;
    animation: pulse 2s infinite;
  }

  &:nth-child(2) {
    top: 30px;
    left: 50px;
    animation: pulse 2s infinite 0.5s;
  }

  &:nth-child(3) {
    top: -30px;
    left: 50px;
    animation: pulse 2s infinite 1s;
  }
}

.tech-logo-text {
  position: relative;
  margin-top: 100px;
  font-size: 28px;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  letter-spacing: 2px;
}

.tech-progress-container {
  margin: 30px 0;
}

.tech-progress-bar {
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.tech-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ffff, #0088ff);
  border-radius: 3px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.tech-progress-light {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), transparent);
  animation: progressLight 2s infinite;
}

.tech-progress-text {
  margin-top: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.tech-loading-tips {
  margin: 30px 0;
  text-align: left;
}

.tech-tip-item {
  display: flex;
  align-items: center;
  margin: 10px 0;
  opacity: 0;
  animation: fadeIn 0.5s forwards;

  &:nth-child(1) {
    animation-delay: 0.5s;
  }
  &:nth-child(2) {
    animation-delay: 1s;
  }
  &:nth-child(3) {
    animation-delay: 1.5s;
  }
  &:nth-child(4) {
    animation-delay: 2s;
  }
  &:nth-child(5) {
    animation-delay: 2.5s;
  }
}

.tech-tip-icon {
  color: #00ffff;
  margin-right: 10px;
  font-size: 12px;
}

.tech-tip-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.tech-bottom-info {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.tech-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.particle {
  position: absolute;
  background-color: rgba(0, 255, 255, 0.5);
  border-radius: 50%;
  animation: float 10s infinite linear;
}

@keyframes pulse {
  0% {
    transform: rotate(30deg) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: rotate(30deg) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: rotate(30deg) scale(1);
    opacity: 0.7;
  }
}

@keyframes progressLight {
  0% {
    left: -20px;
  }
  100% {
    left: 100%;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes float {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(-100vh) translateX(100px);
    opacity: 0;
  }
}

/* 主内容样式 */
#main-content {
  height: 100vh;
  width: 100%;
}

#container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: #f0f0f0;
}

#videoContainer {
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 100;
  visibility: hidden;
}

.jindu-con {
  width: 300px;
  height: 10px;
  border-radius: 50px;
  background-color: white;
  margin-top: 10px;
  overflow: hidden;
}

#jindu {
  height: inherit;
  background-color: #007bff;
  width: 0;
}

#jindu-text-con {
  width: 300px;
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  top: 15%;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.5);
  padding: 10px;
}

:deep(.label) {
  padding: 20px;
  background: #123ca8;
  color: aliceblue;
  border-radius: 5px;
  cursor: pointer;
}

.operate-box {
  position: absolute;
  z-index: 100;
  bottom: 20px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 10px;
}

/* 2D地图样式 */
#map-2d {
  position: absolute;
  width: 30%;
  height: 40%;
  bottom: 80px;
  left: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

/* 数据看板样式 */
.data-panel {
  position: absolute;
  top: 32px;
  width: 280px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  z-index: 100;
  padding: 15px;
  box-sizing: border-box;
}

.left-panel {
  left: 20px;
}

.right-panel {
  right: 20px;
}

.panel-header {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-title {
  font-size: 14px;
  color: #666;
}

.data-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-title {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.chart-container {
  margin-top: 15px;
  height: 150px;
}

.normal {
  color: #67c23a;
}

.warning {
  color: #e6a23c;
}

.danger {
  color: #f56c6c;
}

/* 添加缩放比例显示样式 */
.scale-display {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 100;
}
</style>