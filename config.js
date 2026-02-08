// 自动检测运行环境
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

window.config = {
    apiUrl: isProduction ? 'http://localhost:5000' : "http://localhost:5000",

    siderbar: {
        default: 'menu.html'
    },
    navbar: {
        default: 'nav.html'
    }
};