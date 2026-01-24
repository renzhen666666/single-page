const fs = require('fs');
const path = require('path');

class ServerConfig {
    constructor() {
        this.configPath = path.join(__dirname, 'config.js');
        this.configjs = this.readConfigjs();
        this.config = this.configJson();
    }


    readConfigjs() {
        try {
            const configContent = fs.readFileSync(this.configPath, 'utf8');
            return configContent;
        }
        catch (error) {
            console.error('Error reading config.js:', error);
            return '';
        }

    }


    configJson() {
        const matchConfig = this.configjs.match(/window\.config\s*=\s*(\{[\s\S]*?\});/);
        try {
            if (matchConfig) {
                // 使用 Function 构造器安全执行
                const config = new Function('return ' + matchConfig[1])();
                return config;
            }
        } catch (error) {
            console.error('Error parsing config.js:', error);
        }
    }
    
    getKey(key) {
        return this.config[key];
    }
}

module.exports = new ServerConfig();