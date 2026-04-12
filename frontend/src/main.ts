import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import router from './router'

// PrimeVue Components
import Button from 'primevue/button'
import Card from 'primevue/card'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Panel from 'primevue/panel'
import Toolbar from 'primevue/toolbar'
import Menu from 'primevue/menu'
import Sidebar from 'primevue/sidebar'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Timeline from 'primevue/timeline'
import Badge from 'primevue/badge'
import Tooltip from 'primevue/tooltip'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import Knob from 'primevue/knob'
import Skeleton from 'primevue/skeleton'
import ScrollPanel from 'primevue/scrollpanel'
import Message from 'primevue/message'
import InputSwitch from 'primevue/inputswitch'

// PrimeVue Styles
import 'primevue/resources/themes/lara-dark-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

import './style.css'

const app = createApp(App)

// Plugins
app.use(createPinia())
app.use(router)
app.use(PrimeVue, { ripple: true })
app.use(ToastService)

// Components
app.component('Button', Button)
app.component('Card', Card)
app.component('ProgressBar', ProgressBar)
app.component('Tag', Tag)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Panel', Panel)
app.component('Toolbar', Toolbar)
app.component('Menu', Menu)
app.component('PSidebar', Sidebar)
app.component('Dialog', Dialog)
app.component('InputText', InputText)
app.component('Dropdown', Dropdown)
app.component('TabView', TabView)
app.component('TabPanel', TabPanel)
app.component('Timeline', Timeline)
app.component('Badge', Badge)
app.component('Toast', Toast)
app.component('Knob', Knob)
app.component('Skeleton', Skeleton)
app.component('ScrollPanel', ScrollPanel)
app.component('Message', Message)
app.component('InputSwitch', InputSwitch)

// Directives
app.directive('tooltip', Tooltip)

app.mount('#app')
