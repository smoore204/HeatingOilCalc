import { MY_API_KEY } from './config.js';

//initialize variables
var K;
var temps = [];
var oilAmount;
var myChart;

//Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submitButton').addEventListener('click', createURL);
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submitButton_F').addEventListener('click', future);
});


const createURL = (ev) => {

    ev.preventDefault();  //to stop the form submitting
    CalcK();
}

async function CalcK() {

    //Create URL
    const startDate = document.getElementById('startDate').value; //format yy-mm-dd
    const location = document.getElementById('location').value.replace(/,/g, '%2C').replace(/\s/g, '%20');
    const endDate = document.getElementById('endDate').value; //format yy-mm-dd

    const URL = "https://visual-crossing-weather.p.rapidapi.com/history?startDateTime=" +
        startDate + "T00%3A00%3A00&aggregateHours=24&location=" +
        location + "&endDateTime=" +
        endDate + "T23%3A59%3A59&unitGroup=us&contentType=csv&shortColumnNames=0";

    //Make API request
    const response = await fetch(URL, {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "visual-crossing-weather.p.rapidapi.com",
            "x-rapidapi-key": MY_API_KEY
        }
    })

    //check API request worked
    //console.log(response); 

    const data = await response.text();

    //extract temperatures
    const table = data.split('\n').slice(1);

    table.forEach(row => {
        const columns = row.split(',');
        const temp = columns[4];
        temps.push(temp);

    })

    temps = temps.slice(0, -1);

    const myData = temps.map(Number);
    const setDay = document.getElementById('setDay').value;
    const setNight = document.getElementById('setNight').value;
    oilAmount = document.getElementById('oilAmount').value;
    const hours = document.getElementById('nightHours').value;

    //Calc HDD
    const numberDays = myData.length;
    const setTemp = Array(numberDays).fill(setDay);
    var difference = [];
    for (var i = 0; i <= numberDays - 1; i++) {
        difference.push(setTemp[i] - myData[i]);
    }

    let HDD = 0;
    for (let i = 0; i < difference.length; i++) {
        HDD += difference[i];
    }
    const HDDmodfact = (setDay - setNight);
    const HDDmod = HDD - (HDDmodfact * (hours / 24)) * numberDays;
    K = HDDmod / oilAmount;

    //publish K results
    document.getElementById('kFact').textContent = K.toFixed(1);
}

const future = (ev) => {

    ev.preventDefault();  //to stop the form submitting
    CalcFuture();
}

async function CalcFuture() {



    const locPlaceholder = document.getElementById('location').value;
    const location = locPlaceholder.replace(/,/g, '%2C').replace(/\s/g, '%20');

    //Get lat and Lng from location using Google API
    const URL = "https://google-maps-geocoding.p.rapidapi.com/geocode/json?address="
        + location + "&language=en";

    //Make API request
    const response = await fetch(URL, {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "google-maps-geocoding.p.rapidapi.com",
            "x-rapidapi-key": MY_API_KEY
        }
    })
    const data = await response.json();
    console.log(data);
    const dataParse = JSON.parse(JSON.stringify(data));
    const lat = dataParse.results[0].geometry.location.lat;
    const lng = dataParse.results[0].geometry.location.lng;

    //Get monthly weather data from Meteostat API
    //Nearby stations
    const stationResponse = await fetch("https://meteostat.p.rapidapi.com/stations/nearby?lat="
        + lat + "&lon="
        + lng, {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "meteostat.p.rapidapi.com",
            "x-rapidapi-key": MY_API_KEY
        }
    })

    const stationData = await stationResponse.json();
    const stationParse = JSON.parse(JSON.stringify(stationData));
    const stationID = stationParse.data[0].id;

    //get monthly data
    const monthlyResponse = await fetch("https://meteostat.p.rapidapi.com/stations/monthly?station="
        + stationID + "&start=2021-01-01&end=2021-12-31&units=imperial", {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "meteostat.p.rapidapi.com",
            "x-rapidapi-key": MY_API_KEY
        }
    })

    const monthlyData = await monthlyResponse.json();
    console.log(monthlyData);
    const monthlyParse = JSON.parse(JSON.stringify(monthlyData));

    var monthlyTemps = [];
    for (let i = 0; i < 12; i++) {
        monthlyTemps.push(monthlyParse.data[i].tavg);
    }

    const setTemp_F = document.getElementById('setDay_F').value;
    const setNight_F = document.getElementById('setNight_F').value;
    const nightHours_F = document.getElementById('nightHours_F').value;
    const oilCost = document.getElementById('cost').value;

    const tempValue = setTemp_F -((setTemp_F-setNight_F)*nightHours_F/24);

    const oilUsage = []
    var oilTot = 0;

    for (let i = 0; i < 12; i++) {
        var value = (tempValue - monthlyTemps[i]) / K;
        if (value < 0.5){
            value = 0;
        }
        oilUsage.push(Math.round(value * 30));
        oilTot += value*30;
    }

    const price = []
    var priceTot = 0;
    for (let i = 0; i < 12; i++) {
        price.push(Math.round(oilUsage[i]*oilCost));
        priceTot += (oilUsage[i]*oilCost);
    }

    //Add total oil usage and cost to document
    document.getElementById("oilTot").textContent = oilTot.toFixed(1);
    document.getElementById("costTot").textContent = "$" + Math.round(priceTot).toLocaleString("en-US");

    //Make Chart

    const labels = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];
    
      const mydata = {
        labels: labels,
        datasets: [{
          label: 'Oil Amounts',
          backgroundColor: 'rgb(23, 50, 255)',
          borderColor: 'rgb(23, 50, 255)',
          data: oilUsage,
        },
        {
            label: 'Oil Cost',
            backgroundColor: 'rgb(255, 185, 23)',
            borderColor: 'rgb(255, 185, 23)',
            data: price,
          }
    
        ]
      };
    
      const config = {
        type: 'bar',
        data: mydata,
        options: {
            maintainAspectRatio: false,
        }
      };

      //delete barchart and canvas data
      const canvas = document.getElementById('barChart')
      const context = canvas.getContext('2d');
      console.log(canvas);
      console.log(context);
        
      console.log(myChart);
      if(myChart != null){
        myChart.destroy();
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      console.log(myChart);
      
      //create new chart
      myChart = new Chart(
        document.getElementById('barChart'),
        config
      );


}

//Hover feature
window.onmousemove = function(e){
    if (e.target.classList.contains('hover')){
        var $target = e.target; //	Content of dot which is hovered
        //	Only work with hovered target
        //	Add visible class hovered elem to distinguish
        if (!$target.classList.contains('visible')) {
        		$target.classList.add('visible');
        } else {
            //	Get viewport offset of tooltip element
            var offset = $target.parentElement.getBoundingClientRect();
            //	Tooltip distance from mouse(px)
            var tipDist = 0;
            //	Calc and set new tooltip location
            $target.style.top = (e.clientY - offset.top + tipDist) + 'px';
            $target.style.left = (e.clientX - offset.left + tipDist) + 'px';
        }
    } else {
    		//	Remove visible class
        var content = document.getElementsByClassName('hoverContent');
        for (var i = 0; i < content.length; i++) {
        		content[i].classList.remove('visible');
        }
    }

};
    






