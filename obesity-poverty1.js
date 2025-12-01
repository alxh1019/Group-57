const data = d3.csv("data/obesity_analysis_final.csv");

data.then((_obData) => {
  _obData.forEach((row) => {
    // need to do || i did ?? originally but that doesnt catch empty strings on null values
    row.ObesityRate = +row["Obesity Rate"] || 0;
    row.Year = +row.Year;
    row.AverageObesityRate = +row["Avg_Obesity_Rate"] || 0;
    row.Education = +row.Education || 0;
    row.PublicWelfare = +row["Public welfare"] || 0;
    row.Health = +row.Health || 0;
    row.Total = row.Education + row.PublicWelfare + row.Health;
  });

  // some years didnt report obesity so we need to drop those
  const obData = _obData.filter((row) => !!row.ObesityRate);

  // get the codes of the states in order of average obesity rate for the 3 years
  const stateCodes = _obData
    .sort((a, b) => b.AverageObesityRate - a.AverageObesityRate)
    .map((d) => d.Code);

  const width = 1100,
    height = 700;
  const margin = {
    top: 60,
    bottom: 100,
    left: 80,
    right: 80,
  };

  let svg = d3
    .select("#barplot")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "white");

  // Add scales

  const xScale = d3
    .scaleBand()
    .domain(stateCodes)
    .range([margin.left, width - margin.right])
    .padding(0.3);

  // usually would do height - margin.bottom but we want to stack so divide by 2
  const absBottom = height - margin.bottom; // very bottom of chart
  const middle = absBottom / 2; // w/ svg the higher the val the lower so divide absBottom by 2 to split
  const yScaleSpending = d3
    .scaleLinear()
    .domain([0, d3.max(obData, (d) => d.Total)])
    .range([absBottom, middle + 10]); // +10 prevents the top and bottom ticks from overlapping

  const yScaleObesity = d3
    .scaleLinear()
    .domain([0, d3.max(obData, (d) => d.ObesityRate)])
    .range([middle, margin.top]);

  // I got these from colorgorical with Perceptual Distance at max, name difference at 0, pair preference at 50% and name Uniqueness at 0
  // for 3 colors
  const yearColorScale = d3
    .scaleOrdinal()
    .domain([2021, 2022, 2023])
    .range(["#b4ddd4", "#691b9e", "#8fca40"]);
  // I used the same process for these except I used "#b4ddd4" the first color of the other scale
  // as the starter color and set pairwise to 0 while keeping perceptual distance at 100% to maximise contrast while still having
  // a similar ish look
  const categoryColorScale = d3
    .scaleOrdinal()
    .domain(["Education", "PublicWelfare", "Health"])
    .range(["#b4ddd4", "#7b2c31", "#1cf1a3"]);

  svg
    .append("g")
    .call(d3.axisLeft(yScaleObesity))
    .attr("transform", `translate(${margin.left}, 0)`);

  svg
    .append("g")
    .call(d3.axisLeft(yScaleSpending))
    .attr("transform", `translate(${margin.left}, 0)`);

  // y axis titles
  svg
    .append("text")
    .attr("x", margin.left - 250)
    .attr("y", 30)
    .text("Obesity Rate (%)")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "middle");
  svg
    .append("text")
    .attr("x", margin.left - 525)
    .attr("y", 30)
    .text("Total Spend (Millions)")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "middle");

  const spendingCategory = ["Education", "PublicWelfare", "Health"];
  const years = [2021, 2022, 2023];
  const barWidth = xScale.bandwidth() / 3;

  years.forEach((year, yearIdx) => {
    // get all the data for the year
    const yearData = obData.filter((row) => row.Year === year);

    // create a map of state code to data for this year
    const stateCodeToData = yearData.reduce((acc, row) => {
      acc[row.Code] = row;
      return acc;
    }, {});

    spendingCategory.forEach((category, categoryIdx) => {
      svg
        .selectAll(`.spending-${year}-${category}`)
        .data(stateCodes)
        .enter()
        .append("rect")
        .attr("class", `spending-${year}-${category}`) // need per year per category because we want to stack bars for each cat for each year
        .attr("x", (code) => xScale(code) + yearIdx * barWidth)
        .attr("y", (code) => {
          // we want to start the bar at the top of the prev bar within this category
          // this is because when we define the height of the bar it will extend downward not upward
          const row = stateCodeToData[code];
          if (!row) return yScaleSpending(0);
          let barTop = 0;
          // sum up each of the prev categories to get the total starting position
          // so if we are in the second category PublicWelfare categoryIdx will be 0 so we
          // want to start at the top of the Education bar so we iterate until i <= categoryIdx
          for (let i = 0; i <= categoryIdx; i++) {
            barTop += row[spendingCategory[i]];
          }
          // console.log(
          //   "barTop",
          //   spendingCategory[yearIdx],
          //   yScaleSpending(barTop)
          // );
          return yScaleSpending(barTop);
        })
        .attr("width", barWidth * 0.9)
        .attr("height", (code) => {
          const row = stateCodeToData[code];
          if (!row) return 0;
          const bottom = yScaleSpending(0);
          const top = yScaleSpending(row[category]);
          // console.log(category, bottom, top, bottom - top);
          return bottom - top;
        })
        .attr("fill", categoryColorScale(category));
    });
  });

  years.forEach((year, yearIndex) => {
    const yearData = obData.filter((row) => row.Year === year);

    // create a map of state code to data for this year
    const stateCodeToData = yearData.reduce((acc, row) => {
      acc[row.Code] = row.ObesityRate;
      return acc;
    }, {});

    svg
      .selectAll(`.obesity-${year}`)
      .data(stateCodes)
      .enter()
      .append("rect")
      .attr("class", `obesity-${year}`)
      .attr("x", (code) => xScale(code) + yearIndex * barWidth)
      .attr("y", (code) => yScaleObesity(stateCodeToData[code])) // already made the scale start at the top of the spending chart so dont need to change anything
      .attr("width", barWidth * 0.9)
      .attr("height", (code) => {
        // middle is the bottom of the obesity chart so like previously we subtract the top to get the size
        return middle - yScaleObesity(stateCodeToData[code]);
      })
      .attr("fill", yearColorScale(year));
  });
  // include the average obesity rate as part of the axis label
  svg
    .append("g")
    .call(d3.axisBottom(xScale))
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .style("font-size", "12px")
    .text((code) => {
      const stateData = obData.find((row) => row.Code === code);
      return `${code} (${stateData.AverageObesityRate.toFixed(1)})`;
    });

  // add titles
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .text("Obesity Rate & State Spending by Category (2021-2023)")
    .style("text-anchor", "middle");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 20)
    .text("State Sorted by Average Obesity Rate from 2021-2023")
    .style("text-anchor", "middle");

  // first key for years coloring
  const yearsLegend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - margin.right - 200}, ${margin.top})`
    );

  svg
    .append("text")
    .attr("x", width - margin.right - 200)
    .attr("y", margin.top - 10)
    .text("Years");

  // second key for spending category coloring
  const legendCategories = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - margin.right - 100}, ${margin.top})`
    );

  svg
    .append("text")
    .attr("x", width - margin.right - 100) // we want the two keys next to each other so same y but different x postition
    .attr("y", margin.top - 10)
    .text("Spending Categories");

  years.forEach((year, i) => {
    const yearLegend = yearsLegend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    yearLegend
      .append("rect")
      .attr("width", 13)
      .attr("height", 13)
      .attr("fill", yearColorScale(year));

    yearLegend.append("text").attr("x", 20).attr("y", 12).text(year);
  });

  spendingCategory.forEach((category, i) => {
    const yearLegend = legendCategories
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    yearLegend
      .append("rect")
      .attr("width", 13)
      .attr("height", 13)
      .attr("fill", categoryColorScale(category));

    yearLegend.append("text").attr("x", 20).attr("y", 12).text(category);
  });
});
