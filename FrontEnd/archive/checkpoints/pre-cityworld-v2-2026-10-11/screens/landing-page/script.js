"use strict";
// CityWorld is presentation and navigation only; ASP.NET will own all data.
import('./city/intro.js').then(({mountCityWorld})=>mountCityWorld()).catch(error=>{
  document.body.classList.remove('city-ready','has-scroll-timeline');
  document.getElementById('city-load-status').textContent='The 3D view is unavailable. Explore RoadNa JO with the location links below.';
  document.getElementById('city-transcript').open=true;
  document.getElementById('city-control-hint').textContent='Choose a location below';
  console.warn('CityWorld fallback:',error.message);
});
