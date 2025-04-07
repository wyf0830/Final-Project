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
        
            const d3DataPath = 'data/d3_calendar_heatmap_data.csv';
            const d3ContainerId = '#vis5_d3_calendar'; 

            d3.csv(d3DataPath).then(data => {
                console.log("D3 data loaded:", data);

                // 1. --- Data preprocessing ---
                const parseDate = d3.timeParse("%Y-%m-%d");
                data.forEach(d => {
                    d.date = parseDate(d.stock_date); 
                    d.daily_return = +d.daily_return; 
                    d.prev_1day_mean_score = +d.prev_1day_mean_score; // Conversion to numeric values
                    d.prev_1day_news_count = +d.prev_1day_news_count; // Conversion to numeric values
                    d.year = d.date.getFullYear();
                });

                // Data grouped by year
                const dataByYear = d3.group(data, d => d.year);
                const years = Array.from(dataByYear.keys()).sort();

                // 2. --- Set SVG size, margins ---
                const cellSize = 15; // Size of each cell
                const yearHeight = cellSize * 7 + 25; // 7 days + interval
                const margin = {top: 30, right: 30, bottom: 30, left: 50}; // Leave room for weekly labels
                // Width needs to accommodate the longest year (about 53 weeks)
                const width = (cellSize * 53) + margin.left + margin.right;
                // Total height based on number of years
                const height = (yearHeight * years.length) + margin.top + margin.bottom;

                // 3. --- Creating an SVG Canvas ---
                // Remove any old SVGs that may already exist (if running the script repeatedly)
                d3.select(d3ContainerId).select("svg").remove();

                const svg = d3.select(d3ContainerId)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

                // 4. --- Define the color scale (Scales) ---
                // Maps daily_return to a color. Use the diffuse color scale: negative is red, white around zero, positive is green
                const maxAbsReturn = d3.max(data, d => Math.abs(d.daily_return));
                const colorScale = d3.scaleSequential(d3.interpolateRdYlGn) 
                                     .domain([-maxAbsReturn, maxAbsReturn]); // Color range based on maximum absolute return

                // 7. --- Add Tooltip --- (Prepare before drawing)
                // Create a div for the tooltip (it's best to predefine an empty div in the HTML)
                // If not defined in HTML, it can be created dynamically here.
                 let tooltip = d3.select("body").select(".d3-tooltip");
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


                // --- Cycle through the yearly calendar ---
                const yearGroups = svg.selectAll(".year")
                    .data(years)
                    .enter().append("g")
                    .attr("class", "year")
                    .attr("transform", (d, i) => `translate(0, ${i * yearHeight})`);

                // Add Year Label
                yearGroups.append("text")
                    .attr("x", 0)
                    .attr("y", -8)
                    .attr("font-size", "16px")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", "start")
                    .text(d => d);

                // 5 & 6. --- Get the data for the year (rect) ---
                yearGroups.selectAll(".day")
                    // .data(d => dataByYear.get(d)) // Get the data for the year
                    // Use d3.timeDays to get each day of the year and then look up the corresponding data so that you can draw spaces without data
                    .data(year => d3.timeDays(new Date(year, 0, 1), new Date(year + 1, 0, 1)))
                    .enter().append("rect")
                    .attr("class", "day")
                    .attr("width", cellSize - 1) // Leave cell gaps
                    .attr("height", cellSize - 1)
                    .attr("x", d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize) // Number of weeks of calculation * Cell size
                    .attr("y", d => d.getDay() * cellSize) // getDay() returns 0 (Sunday) - 6 (Saturday)
                    .datum(d => {
                        // Find the corresponding data record for this date
                        const dateString = d3.timeFormat("%Y-%m-%d")(d);
                        // Use find instead of filter because dates are unique!
                        return data.find(item => item.stock_date === dateString);
                    })
                    .filter(d => d) // Plot only dates with data (datum returns not undefined)
                    .attr("fill", d => colorScale(d.daily_return)) // Fill colors based on returns
                    // 7. Adding Interactions (Tooltips)
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
                        d3.select(this).style("stroke", "none"); 
                    });

                
                const firstYearGroup = svg.select(".year"); 
                const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; 
                 firstYearGroup.selectAll(".dayLabel")
                    .data(d3.range(7)) // 0 到 6
                    .enter().append("text")
                    .attr("class", "dayLabel")
                    .attr("x", -10) 
                    .attr("y", d => (d + 0.5) * cellSize)
                    .attr("dy", "0.31em") 
                    .attr("text-anchor", "end")
                    .attr("font-size", "10px")
                    .text(d => daysOfWeek[d]); 

                console.log("D3 Calendar Heatmap rendering logic for", d3ContainerId, "is implemented (basic version).");
                // --- End D3 plotting code ---

            }).catch(error => console.error('Error loading or processing D3 data:', error));

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
  