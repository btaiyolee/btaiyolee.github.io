let selectedGenres = [];
let genreData = [];
let genres = [];

let currentScene = 0;

let svg;
let x;
let y;
let line;
let color;
let tooltip;

const scenes = [
    {
        title: "Declining Genres",
        annotation: "As time progresses, comedies, romantic comedies, thrillers, and documentaries make less money on average. Some hypothesize that, as VFX technology improved, movies with more visual spectacle (like Avatar or Marvel movies) outcompeted the less-flashy, character-driven genres.",
        genres: ["Comedy", "Romantic Comedy", "Thriller or Suspense", "Documentary"]
    },
    {
        title: "Mainstay Cinema Genres",
        annotation: "Despite year-to-year fluctuations due to blockbuster hits, action and adventure have and continue to be the most lucrative and consistently performing genres.",
        genres: ["Adventure", "Action"]
    },
    {
        title: "Explore!",
        annotation: "Choose any combination of genres below to compare them.",
        genres: []
    },
];

async function init(){
    const data = await d3.csv("./Data/ThrowbackDataThursday Week 11 - Film Genre Stats.csv");

    data.forEach(row => {
        row.Year = +row.Year;
        row.Gross = (+row["Inflation-Adjusted Gross"] / +row["Movies Released"]);
        row.MovieGross = +row["Top Movie Inflation-Adjusted Gross (That Year)"];
        row.Genre = row.Genre;
    });

    data.forEach(row => {
        if(!genres.includes(row.Genre) && row.Genre != "Multiple Genres"){
            genres.push(row.Genre);
        }
    });

    genreData = genres.map(genre => { 
        return {
            genre: genre,
            values: data.filter(row => row.Genre == genre).map(row => ({
                year:row.Year,
                gross:row.Gross,
                movie:row["Top Movie"],
                movieGross:row.MovieGross,
                moviesReleased:+row["Movies Released"]
            })).sort((a,b) => a.year - b.year)
        };
    });

    createButtons(genres);

    createChart();

    loadScene(0);

    document
    .getElementById("nextButton")
    .onclick = function(){
        if(currentScene < scenes.length - 1){
            loadScene(currentScene + 1);
        }
    };

    document.getElementById("prevButton").onclick = function(){
        if(currentScene > 0){
            loadScene(currentScene - 1);
        }
    };
}

function createButtons(genres){
    const container = d3.select("#buttons");

    genres.forEach(genre => { container.append("button")
        .text(genre)
        .attr("class", "genre-button")
        .on("click",function(){
            if(selectedGenres.includes(genre)){
                selectedGenres = selectedGenres.filter(selGenre => selGenre !== genre);

                d3.select(this).classed("active", false);
            }
            else{
                selectedGenres.push(genre);

                d3.select(this).classed("active", true);
            }

            redrawChart();
        });
    });
}

function createChart(){
    const width = 1000;
    const height = 600;

    const topMargin = 60;
    const rightMargin = 180;
    const bottomMargin = 70;
    const leftMargin = 120;

    const chartWidth = width - leftMargin - rightMargin;
    const chartHeight = height - topMargin - bottomMargin;

    svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height);

    const chart = svg.append("g")
        .attr("transform", `translate(${leftMargin}, ${topMargin})`);

    color = d3.scaleOrdinal(d3.schemeTableau10);

    x = d3.scaleLinear().range([0, chartWidth]);

    y = d3.scaleLinear().range([chartHeight, 0]);

    line = d3.line().x(i => x(i.year)).y(i => y(i.gross));

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${chartHeight})`);

    chart.append("g")
        .attr("class", "y-axis");

    chart.append("g")
        .attr("class","lines");

    chart.append("text")
        .attr("class", "x-label")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 45)
        .attr("text-anchor", "middle")
        .text("Year");

    chart.append("text")
        .attr("class", "y-label")
        .attr("x", -chartHeight / 2)
        .attr("y", -70)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Average Revenue Per Movie (USD, Inflation-Adjusted)");
}

function redrawChart(){
    const selected = genreData.filter(data => selectedGenres.includes(data.genre));

    const lines = d3.select(".lines");

    if(selected.length == 0){
        lines.selectAll("*").remove();

        return;
    }

    const allValues = selected.flatMap(i => i.values);

    x.domain([d3.min(allValues, i => i.year), d3.max(allValues,i => i.year)]).nice();
    y.domain([0, d3.max(allValues, i => i.gross)]).nice();

    d3.select(".x-axis").call(d3.axisBottom(x));
    d3.select(".y-axis").call(d3.axisLeft(y));

    const paths = lines.selectAll(".genre-line").data(selected,i => i.genre);

    paths.enter().append("path")
        .attr("class", "genre-line")
        .merge(paths)
        .attr("fill", "none")
        .attr("stroke", i => color(i.genre))
        .attr("stroke-width", 3)
        .attr("d",i => line(i.values));

    paths.exit().remove();

    const hover = lines.selectAll(".hover-line").data(selected, i => i.genre);

    hover.enter().append("path")
        .attr("class","hover-line")
        .merge(hover)
        .attr("fill","none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 25)
        .attr("pointer-events", "stroke")
        .attr("d", i => line(i.values))
        .raise()
        .on("mousemove",function(d){
            const mouseX = d3.mouse(this)[0];

            const year = Math.round(x.invert(mouseX));
            let closest = d.values[0];

            d.values.forEach(value =>{
                if(Math.abs(value.year-year) < Math.abs(closest.year-year))
                {
                    closest = value;
                }
            });

            lines.selectAll(".hover-point").remove();

            lines.append("circle")
                .attr("class", "hover-point")
                .attr("cx", x(closest.year))
                .attr("cy", y(closest.gross))
                .attr("r", 6)
                .attr("fill",color(d.genre)
            );
            
            tooltip.style("opacity", 1)
                .html(
                    "<b>"+d.genre+"</b><br>"+
                    "Year: "+closest.year+
                    "<br><br>"+
                    "<b>Movies Released:</b> "+
                    closest.moviesReleased+
                    "<br><br>"+
                    "<b>Top Movie:</b><br>"+
                    closest.movie+
                    "<br><br>"+
                    "<b>Revenue:</b> $" +
                    d3.format(",")(closest.movieGross)
                )
                .style("left", (d3.event.pageX + 15) + "px")
                .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mouseout",function(){
            tooltip.style("opacity", 0);

            lines.selectAll(".hover-point").remove();
        }
    );

    hover.exit().remove();
}

function loadScene(sceneIndex){
    currentScene = sceneIndex;

    document.getElementById("sceneTitle").innerHTML = scenes[currentScene].title;
    document.getElementById("annotation").innerHTML = scenes[currentScene].annotation;
    document.getElementById("sceneNumber").innerHTML = (currentScene + 1) + " / 3";

    selectedGenres = [];

    d3.selectAll(".genre-button").classed("active", false);

    if(currentScene < 2){
        selectedGenres = [...scenes[currentScene].genres];

        d3.selectAll(".genre-button").property("disabled", true);

        selectedGenres.forEach(genre =>{
            d3.selectAll(".genre-button")
                .filter(function(){ return this.innerHTML === genre; })
                .classed("active", true);
        });
    }
    else{
        d3.selectAll(".genre-button").property("disabled", false);
    }

    redrawChart();
}