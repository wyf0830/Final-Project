// 等待 HTML 文档完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', function() {

    console.log("网页加载完成，开始执行脚本...");

    // --- 嵌入 Altair 图表 ---
    // 使用 Vega-Embed 将保存的 JSON 文件嵌入到对应的 div 中

    // 图表 1
    const spec1 = 'data/nvidia_price_timeseries.json'; // 对应您保存的文件名
    vegaEmbed('#vis1_price_timeseries', spec1, {"actions": false}) // {"actions": false} 隐藏右上角菜单
      .then(result => console.log('Altair Chart 1 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 1:', error));

    // 图表 2
    const spec2 = 'data/return_vs_sentiment_scatter.json';
    vegaEmbed('#vis2_return_sentiment_scatter', spec2, {"actions": false})
      .then(result => console.log('Altair Chart 2 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 2:', error));

    // 图表 3 (如果生成了)
    const spec3 = 'data/sentiment_histogram.json';
    vegaEmbed('#vis3_sentiment_histogram', spec3, {"actions": false})
      .then(result => console.log('Altair Chart 3 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 3:', error));

    // 图表 4 (如果生成了)
    const spec4 = 'data/return_by_sentiment_boxplot.json';
    vegaEmbed('#vis4_return_by_sentiment_boxplot', spec4, {"actions": false})
      .then(result => console.log('Altair Chart 4 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 4:', error));

// --- 实现 D3.js 图表 (至少一个) ---
            // 图表 5 (D3 示例 - 日历热力图)
            const d3DataPath = 'data/d3_calendar_heatmap_data.csv'; // 对应您准备的数据文件
            const d3ContainerId = '#vis5_d3_calendar'; // 对应 HTML 中的 div ID

            d3.csv(d3DataPath).then(data => {
                console.log("D3 data loaded:", data);

                // 1. --- 数据预处理 ---
                const parseDate = d3.timeParse("%Y-%m-%d");
                data.forEach(d => {
                    d.date = parseDate(d.stock_date); // 转换为 JS Date 对象
                    d.daily_return = +d.daily_return; // 转换为数值
                    d.prev_1day_mean_score = +d.prev_1day_mean_score; // 转换为数值
                    d.prev_1day_news_count = +d.prev_1day_news_count; // 转换为数值
                    d.year = d.date.getFullYear();
                });

                // 按年份分组数据
                const dataByYear = d3.group(data, d => d.year);
                const years = Array.from(dataByYear.keys()).sort();

                // 2. --- 设置 SVG 尺寸、边距 ---
                const cellSize = 15; // 每个单元格的大小
                const yearHeight = cellSize * 7 + 25; // 7天 + 间隔
                const margin = {top: 30, right: 30, bottom: 30, left: 50}; // 留出空间给星期标签
                // 宽度需要适应最长的年份（大约53周）
                const width = (cellSize * 53) + margin.left + margin.right;
                // 总高度基于年份数量
                const height = (yearHeight * years.length) + margin.top + margin.bottom;

                // 3. --- 创建 SVG 画布 ---
                // 先清除可能已存在的旧 SVG (如果重复运行脚本)
                d3.select(d3ContainerId).select("svg").remove();

                const svg = d3.select(d3ContainerId)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

                // 4. --- 定义颜色比例尺 (Scales) ---
                // 映射 daily_return 到颜色。使用发散色标：负为红色，零附近白色，正为绿色
                const maxAbsReturn = d3.max(data, d => Math.abs(d.daily_return));
                const colorScale = d3.scaleSequential(d3.interpolateRdYlGn) // 红-黄-绿
                                     .domain([-maxAbsReturn, maxAbsReturn]); // 颜色范围基于最大绝对回报率

                // 7. --- 添加 Tooltip --- (在绘图前准备)
                // 创建一个 div 用于 tooltip (最好在 HTML 中预先定义一个空的 div)
                // 如果没有在 HTML 定义，可以在这里动态创建
                 let tooltip = d3.select("body").select(".d3-tooltip");
                 if (tooltip.empty()) {
                     tooltip = d3.select("body").append("div")
                         .attr("class", "d3-tooltip") // 给 tooltip 添加 class 以便 CSS 设置样式
                         .style("position", "absolute")
                         .style("visibility", "hidden")
                         .style("background", "rgba(0,0,0,0.7)")
                         .style("color", "#fff")
                         .style("padding", "5px 10px")
                         .style("border-radius", "3px")
                         .style("font-size", "12px");
                 }


                // --- 循环绘制每年的日历 ---
                const yearGroups = svg.selectAll(".year")
                    .data(years)
                    .enter().append("g")
                    .attr("class", "year")
                    .attr("transform", (d, i) => `translate(0, ${i * yearHeight})`);

                // 添加年份标签
                yearGroups.append("text")
                    .attr("x", 0)
                    .attr("y", -8) // 在日历上方
                    .attr("font-size", "16px")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", "start")
                    .text(d => d);

                // 5 & 6. --- 绑定数据并绘制图形元素 (rect) ---
                yearGroups.selectAll(".day")
                    // .data(d => dataByYear.get(d)) // 获取该年份的数据
                    // 使用 d3.timeDays 来获取一年中的每一天，然后查找对应数据，这样可以画出没有数据的空格
                    .data(year => d3.timeDays(new Date(year, 0, 1), new Date(year + 1, 0, 1)))
                    .enter().append("rect")
                    .attr("class", "day")
                    .attr("width", cellSize - 1) // 留出单元格间隙
                    .attr("height", cellSize - 1)
                    .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize) // 计算周数 * 单元格大小
                    .attr("y", d => d.getDay() * cellSize) // getDay() 返回 0(周日)-6(周六)
                    .datum(d => {
                        // 为这个日期查找对应的数据记录
                        const dateString = d3.timeFormat("%Y-%m-%d")(d);
                        // 使用 find 而不是 filter，因为日期是唯一的
                        return data.find(item => item.stock_date === dateString);
                    })
                    .filter(d => d) // 只绘制有数据的日期 (datum 返回的不是 undefined)
                    .attr("fill", d => colorScale(d.daily_return)) // 根据回报率填充颜色
                    // 7. 添加交互 (Tooltips)
                    .on("mouseover", function(event, d) {
                        tooltip.style("visibility", "visible")
                               .html(`<strong>Date:</strong> ${d.stock_date}<br/>
                                      <strong>Return:</strong> ${d.daily_return.toFixed(2)}%<br/>
                                      <strong>Prev. Sentiment:</strong> ${d.prev_1day_mean_score.toFixed(3)}<br/>
                                      <strong>Prev. News Count:</strong> ${d.prev_1day_news_count}`);
                        d3.select(this).style("stroke", "black").style("stroke-width", 1.5); // 高亮边框
                    })
                    .on("mousemove", function(event) {
                        tooltip.style("top", (event.pageY - 10) + "px")
                               .style("left",(event.pageX + 10) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.style("visibility", "hidden");
                        d3.select(this).style("stroke", "none"); // 移除高亮
                    });

                // (可选) 8. 添加星期标签 (例如在第一个年份旁边添加)
                const firstYearGroup = svg.select(".year"); // 选择第一个年份的 g 元素
                const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // 或者从周一开始
                 firstYearGroup.selectAll(".dayLabel")
                    .data(d3.range(7)) // 0 到 6
                    .enter().append("text")
                    .attr("class", "dayLabel")
                    .attr("x", -10) // 在日历左侧
                    .attr("y", d => (d + 0.5) * cellSize) // 垂直居中于单元格
                    .attr("dy", "0.31em") // 微调垂直位置
                    .attr("text-anchor", "end")
                    .attr("font-size", "10px")
                    .text(d => daysOfWeek[d]); // 显示星期几

                console.log("D3 Calendar Heatmap rendering logic for", d3ContainerId, "is implemented (basic version).");
                // --- 结束 D3 绘图代码 ---

            }).catch(error => console.error('Error loading or processing D3 data:', error));

    // --- 确保满足所有交互要求 ---
    // 检查您的 Altair 和 D3 图表是否总共包含了至少 3 种不同的交互。
    // (这个例子中包括: Altair 的缩放/平移/工具提示, D3 的工具提示。您可能需要更多交互)

    console.log("页面脚本执行完毕。");
});

function downloadChart(chartId) {
    const chartDiv = document.getElementById(chartId);
    const canvas = chartDiv.querySelector('canvas');
  
    if (!canvas) {
      alert("未找到图像（可能该图还在加载或是 SVG 格式）");
      return;
    }
  
    const link = document.createElement('a');
    link.download = `${chartId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function downloadSVGChart(chartId) {
    const chartDiv = document.getElementById(chartId);
    const svg = chartDiv.querySelector('svg');
  
    if (!svg) {
      alert("未找到 SVG 图像！");
      return;
    }
  
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
  
    const image = new Image();
    image.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth;
      canvas.height = svg.clientHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
  
      const link = document.createElement("a");
      link.download = `${chartId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    image.src = url;
}
  

// --- 回到顶部按钮：平滑滚动 ---
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
  
  // --- 页面滚动时控制按钮显示 ---
  window.onscroll = function () {
    const btn = document.getElementById("backToTopBtn");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
      btn.style.display = "block";
    } else {
      btn.style.display = "none";
    }
};
  