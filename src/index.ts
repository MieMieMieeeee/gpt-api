import { Schema,Context,Logger } from 'koishi'
import Gpt from '@mirror_cy/gpt'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { Config } from 'koishi/lib/worker/daemon'

export const name = '@miemiemie/koishi-plugin-gpt-api';
const logger=new Logger(name)

class ApiGpt extends Gpt {
  config: ApiGpt.Config;
  constructor(ctx: Context, config: ApiGpt.Config) {
    super(ctx); // 调用父类的构造函数
    this.config = config;
  }

  url(): string {
    return this.config.reverseProxy+"/v1/chat/completions"
  }

  async sendRequest(messages) {
    const url: string = this.config.reverseProxySwitch
      ? this.config.reverseProxy + "/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const data = {
      "model": this.config.model,
      "messages": messages,
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
    const res = await this.ctx.http.post(url, data, { headers })
    .catch(error => {
        logger.error("Error: ",error.message)
        throw new Error('Request failed: ' + error.message);
    });

    if (!res) {
      logger.error('Invalid response')
      throw new Error('Invalid response');
    }
    return res
  }

  async ask(prompt, id) {
    if (!prompt || typeof prompt !== 'string' || !id || typeof id !== 'string') {
        throw new Error('Invalid parameters');
    }
    const request = [{"role": "user", "content": `${prompt}`}];
    const res = await this.sendRequest(request);
    logger.debug("GPT ask:", res)
    return { id: id, text: res.choices[0].message.content };
  }

  //暂不支持上下文
  async reset(id) {
    if (!id || typeof id !== 'string') {
        throw new Error('Invalid parameters');
    }
    return true;
  }
}

namespace ApiGpt {
  export interface Config {
    apiKey: string,
    model?: string,
    reverseProxySwitch?: boolean,
    reverseProxy?: string
  }

  export const Config: Schema<Config> = Schema.object({
    apiKey: Schema.string().required().role('secret').description('Api Key'),
    model: Schema.string().default('gpt-3.5-turbo').description('gpt model'),
    reverseProxySwitch: Schema.boolean().description('是否启用反向代理').default(false),
    reverseProxy: Schema.string().default('https://gpt.lucent.blog').description('反向代理gpt3.5'),
  })

  export const usage = `使用官方API。\n
  默认模型：gpt-3.5-turbo\n
  暂不支持上下文，也不支持模型切换。
  国内用户请启用反向代理`
}

export default ApiGpt
