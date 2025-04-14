// Wait for the HTML document to fully load before executing the script.
document.addEventListener('DOMContentLoaded', function() {

    console.log("The page loads and starts executing the script...");

    // --- Embedding Altair Diagrams ---
    // Use Vega-Embed to embed the saved JSON file into the corresponding div.

    // Graph 1
    const spec1 = 'data/nvidia_price_timeseries.json';
    vegaEmbed('#vis1_price_timeseries', spec1, {"actions": false}) 
      .then(result => console.log('Altair Chart 1 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 1:', error));

    // Graph 2
    const spec2 = 'data/return_vs_sentiment_scatter.json';
    vegaEmbed('#vis2_return_sentiment_scatter', spec2, {"actions": false})
      .then(result => console.log('Altair Chart 2 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 2:', error));

    // Gragh 3
    const spec3 = 'data/sentiment_histogram.json';
    vegaEmbed('#vis3_sentiment_histogram', spec3, {"actions": false})
      .then(result => console.log('Altair Chart 3 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 3:', error));

    // Gragh 4
    const spec4 = 'data/return_by_sentiment_boxplot.json';
    vegaEmbed('#vis4_return_by_sentiment_boxplot', spec4, {"actions": false})
      .then(result => console.log('Altair Chart 4 embedded successfully', result.view))
      .catch(error => console.error('Error embedding Altair Chart 4:', error));

// --- Implement D3.js charts (at least one) ---
        
            // --- Global variables ---
let calendarData = [];
let years = [];

const d3DataPath = 'data/d3_calendar_heatmap_data.csv';
const d3ContainerId = '#vis5_d3_calendar'; 
const cellSize = 15;
const yearHeight = cellSize * 7 + 25;
const margin = {top: 30, right: 30, bottom: 30, left: 50};
const width = (cellSize * 53) + margin.left + margin.right;

let svg, tooltip, colorScale;

// --- Main drawing function ---
function drawCalendar(yearSubset) {
    d3.select(d3ContainerId).select("svg").remove();
    
    const svgHeight = yearSubset.length * yearHeight + margin.top + margin.bottom;
    svg = d3.select(d3ContainerId)
        .append("svg")
        .attr("width", width)
        .attr("height", yearSubset.length * yearHeight + margin.top + margin.bottom)
        .append("g")
        .style("max-width", "1000px")
        .style("margin", "0 auto") 
        .style("display", "block")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearGroups = svg.selectAll(".year")
        .data(yearSubset)
        .enter().append("g")
        .attr("class", "year")
        .attr("transform", (d, i) => `translate(0, ${i * yearHeight})`);

    yearGroups.append("text")
        .attr("x", 0)
        .attr("y", -8)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "start")
        .text(d => d);

    yearGroups.selectAll(".day")
        .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)).map(date => {
            const ds = d3.timeFormat("%Y-%m-%d")(date);
            const datum = calendarData.find(row => row.stock_date === ds);
            return datum ? {...datum, date: date} : null;
        }).filter(d => d))
        .enter().append("rect")
        .attr("class", "day")
        .attr("width", cellSize - 1)
        .attr("height", cellSize - 1)
        .attr("x", d => d3.timeWeek.count(d3.timeYear(d.date), d.date) * cellSize)
        .attr("y", d => d.date.getDay() * cellSize)
        .attr("fill", d => colorScale(d.daily_return))
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .html(`<strong>Date:</strong> ${d.stock_date}<br/><strong>Return:</strong> ${d.daily_return.toFixed(2)}%<br/><strong>Sentiment:</strong> ${d.prev_1day_mean_score.toFixed(3)}<br/><strong>News Count:</strong> ${d.prev_1day_news_count}`);
            d3.select(this).style("stroke", "black").style("stroke-width", 1.5);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
            d3.select(this).style("stroke", "none");
        });

    // add week label
    if (svg.selectAll(".dayLabel").empty()) {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      svg.selectAll(".dayLabel")
        .data(d3.range(7))
        .enter().append("text")
        .attr("class", "dayLabel")
        .attr("x", -10)
        .attr("y", d => (d + 0.5) * cellSize)
        .attr("dy", "0.31em")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .text(d => daysOfWeek[d]);
    }

}

// --- CSV Loading and Dropdown Creation ---
d3.csv(d3DataPath).then(data => {
    const parseDate = d3.timeParse("%Y-%m-%d");
    data.forEach(d => {
        d.date = parseDate(d.stock_date);
        d.daily_return = +d.daily_return;
        d.prev_1day_mean_score = +d.prev_1day_mean_score;
        d.prev_1day_news_count = +d.prev_1day_news_count;
        d.year = d.date.getFullYear();
    });
    calendarData = data;

    years = Array.from(d3.group(data, d => d.year).keys()).sort();

    const maxAbsReturn = d3.max(data, d => Math.abs(d.daily_return));
    colorScale = d3.scaleLinear().domain([0, 0.05, 0.15]).range(["#c6dbef", "#3399ff", "#003366"]).clamp(true);

    tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "d3-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "#fff")
            .style("padding", "5px 10px")
            .style("border-radius", "3px")
            .style("font-size", "12px");
    }

    // Populate dropdown
    const dropdown = document.getElementById("yearDropdown");
    years.forEach(y => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.text = y;
        dropdown.appendChild(opt);
    });

    drawCalendar(years); // initial draw
}).catch(error => console.error('Error loading or processing D3 data:', error));

// --- Year filter callback ---
window.updateCalendarByYear = function () {
    const selectedYear = document.getElementById("yearDropdown").value;
    if (selectedYear === "All") {
        drawCalendar(years);
    } else {
        drawCalendar([+selectedYear]);
    }
}



// --- Ensure that all interaction requirements are met ---
// Check that your Altair and D3 charts contain a total of at least 3 different interactions.
    

    console.log("Page script execution is complete.");
});

function downloadChart(chartId) {
    const chartDiv = document.getElementById(chartId);
    const canvas = chartDiv.querySelector('canvas');
  
    if (!canvas) {
      alert("No image found (maybe the image is still loading or in SVG format)）");
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
      alert("SVG image not found!");
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
  

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
  
  
  window.onscroll = function () {
    const btn = document.getElementById("backToTopBtn");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
      btn.style.display = "block";
    } else {
      btn.style.display = "none";
    }
};


