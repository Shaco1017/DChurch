import {
	createSSRApp
} from "vue";
import App from "./App.vue";
import * as route from "@/utils/route";

export function createApp() {
	const app = createSSRApp(App);

	// 全局路由工具：this.$utils.route.go / replace / relaunch / switchTab / back
	// 内置全局锁 + 800ms 节流窗口 + tabBar 自动纠正，防止快速连点与路由类型不匹配
	app.config.globalProperties.$utils = { route };

	return {
		app,
	};
}
