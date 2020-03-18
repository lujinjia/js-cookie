import assign from './assign.mjs'
import defaultConverter from './converter.mjs'

function init (converter, defaultAttributes) {

  /**
   * @description 设置cookie
   * @param key 
   * @param value 
   * @param attributes 
   */
  function set (key, value, attributes) {

    //coookie是依赖于document对象，所以document是必要条件
    if (typeof document === 'undefined') {
      return
    }

    //合并配置性数据，如path等，以set的为先
    attributes = assign({}, defaultAttributes, attributes)

    //设置cookie的expires的过期时间
    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5)
    }

    //expires使用UTC时区（世界统一时间）
    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString()
    }

    //特殊处理，防止输入的key值里有等号，导致设置cookie时有两个等号导致出错
    key = defaultConverter.write(key).replace(/=/g, '%3D')

    //特殊处理，防止值里面有分号；，导致cookie中有错误结尾
    value = converter.write(String(value), key)

    //此段逻辑，用于增加一些参数配置，如path，domain等
    var stringifiedAttributes = ''
    for (var attributeName in attributes) {

      //验证传入的参数配置是否合法，如果在cookie本身默认参数里没有，则跳过此次处理，继续下次处理
      if (!attributes[attributeName]) {
        continue
      }

      stringifiedAttributes += '; ' + attributeName

      //这段代码感觉没有啥用处，不懂 ？
      if (attributes[attributeName] === true) {
        continue
      }

      stringifiedAttributes += '=' + attributes[attributeName].split(';')[0]
    }

    //调用原生的document.cookie来设置cookie
    return (document.cookie = key + '=' + value + stringifiedAttributes)

  }

  /**
   * @description 获取cookie
   * @param key 
   */
  function get (key) {

    //判断是否合法，如果没有document或者arguments为空，则返回undefined
    if (typeof document === 'undefined' || (arguments.length && !key)) {
      return
    }

    //获取所有cookie，没有则设为空数组
    var cookies = document.cookie ? document.cookie.split('; ') : []


    var jar = {}
    for (var i = 0; i < cookies.length; i++) {

      //cookies[i]得到的结果为"test=1"
      var parts = cookies[i].split('=')

      //parts.slice(1)则为获取实际的值1
      var value = parts.slice(1).join('=')

      //由于之前在write的时候，将“=”号转换为“%3D”，这里需要转换回之前的数据，parts[0]表示实际的key值”test“
      var foundKey = defaultConverter.read(parts[0]).replace(/%3D/g, '=')

      //根据最后格式化的foundKey，这里之所以多做一步，是为了给自定义的read方法使用
      jar[foundKey] = converter.read(value, foundKey)

      //当key值和foundKey是相同的，则跳出循环，返回结果
      if (key === foundKey) {
        break
      }

    }

    return key ? jar[key] : jar

  }


  //初始化对外暴露的对象
  return Object.create(
    {

      //暴露读写方法
      set: set,
      get: get,

      //删除cookie属性，通过set方法设置expires来实现
      remove: function (key, attributes) {
        set(
          key,
          '',
          assign({}, attributes, {
            expires: -1
          })
        )
      },
      
      /** 设置到新创建对象的属性attributes和converter，不可枚举 */

      //自定义cookie的属性
      withAttributes: function (attributes) {
        return init(this.converter, assign({}, this.attributes, attributes))
      },

      //自定义cookie属性的读写方法
      withConverter: function (converter) {
        return init(assign({}, this.converter, converter), this.attributes)
      }

    },
    {
      attributes: { value: Object.freeze(defaultAttributes) },
      converter: { value: Object.freeze(converter) }
    }
  )
}

export default init(defaultConverter, { path: '/' })
