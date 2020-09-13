
/*****
 * 时间格式化函数
 * @param {String} fmt 格式化字符串
 * @param {Date} date 时间
 */
function dateFormat(fmt, date) {
    let ret;
    const opt = {
        "y+": date.getFullYear().toString(),
        "M+": (date.getMonth() + 1).toString(),
        "d+": date.getDate().toString(),
        "H+": date.getHours().toString(),
        "m+": date.getMinutes().toString(), 
        "s+": date.getSeconds().toString()
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}

//初始化地图场景
let viewer = new Cesium.Viewer('cesiumContainer',{
    animation:false,
    geocoder:false,
    timeline :false,
    sceneModePicker:false
});
//去掉版权相关信息
viewer._cesiumWidget._creditContainer.style.display="none"; 

//地球自动旋转
viewer.clock.multiplier = 200;
viewer.clock.shouldAnimate = true;
let previousTime = viewer.clock.currentTime.secondsOfDay;
function onTickCallback() {
    let spinRate = 1;
    let currentTime = viewer.clock.currentTime.secondsOfDay;
    let delta = (currentTime - previousTime) / 1000;
    previousTime = currentTime;
    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinRate * delta);
}
viewer.clock.onTick.addEventListener(onTickCallback);

//获取最新疫情数据
let timestamp = dateFormat("yyyyMMddHHmmss",new Date());
let url = "https://route.showapi.com/2217-5?showapi_appid=360051&showapi_timestamp="+timestamp+"&showapi_sign=8242ff260b9e4aa1b7a4f443feb1471d";
let ajax = new XMLHttpRequest();
ajax.open('get',url);
ajax.send();
ajax.onreadystatechange = function () {
    if (ajax.readyState==4 &&ajax.status==200) {
        let covid19Data = JSON.parse(ajax.responseText)
        let dataList = covid19Data.showapi_res_body.foreignList;
        //加载国界KML数据
        Cesium.KmlDataSource.load('data/country_cn.kml').then(dataSource=>{
            let entities = dataSource.entities.values;
            var colorDic = {};
            var desDic = {};
            entities.forEach(entity => {
                if(Cesium.defined(entity.description))
                {
                    //从KML数据中获取国家中英文名称
                    let description = entity.description.getValue();
                    let nameReg = "<th>CNTRY_NAME</th>\n<td>(.+)</td>";
                    let cnNameReg = "<th>NAME_CN</th>\n<td>(.+)</td>";
                    let name = description.match(nameReg)[1];
                    let cnName = description.match(cnNameReg)[1];
                    let sData = null;
                    //对比疫情数据国家名查找相应的数据
                    for (let index = 0; index < dataList.length; index++) {
                        const data = dataList[index];
                        if (data.countryFullName.trim() == name.trim() || data.areaName.trim() == cnName.trim()) {
                            sData = data;
                            break;
                        }
                    }
                    if (sData != null) {
                        if (Cesium.defined(entity.polygon)) {
                            //设置图形高度
                            entity.polygon.extrudedHeight = sData.confirmedNum;
                            if (colorDic[cnName] == null) {
                                colorDic[cnName] = Cesium.Color.fromRandom({alpha : 1.0});
                            }
                            entity.polygon.material = colorDic[cnName];
                            entity.polygon.outline = false;
                            //设置显示确诊数据
                            if (desDic[cnName] == null) {
                                let parser=new DOMParser();
                                let htmlDoc=parser.parseFromString(description, "text/html");
                                var text = '<tr bgcolor=\"#E3E3F3\">\n<th>确诊人数</th>\n<td>' + sData.confirmedNum + '</td>\n</tr>'
                                htmlDoc.getElementsByTagName("tbody")[0].innerHTML += text;
                                entity.description.setValue(htmlDoc.body.innerHTML);
                                desDic[cnName] = true;
                            }
                            viewer.entities.add(entity);
                        }
                        
                    }
                }
            });
            // viewer.dataSources.add(dataSource);
        })
   　}
 }


