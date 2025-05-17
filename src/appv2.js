import Map from "https://js.arcgis.com/4.32/@arcgis/core/Map.js";
import MapView from "https://js.arcgis.com/4.32/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.32/@arcgis/core/layers/FeatureLayer.js";
import Legend from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Legend.js";
import LayerList from "https://js.arcgis.com/4.32/@arcgis/core/widgets/LayerList.js";
import LabelClass from "https://js.arcgis.com/4.32/@arcgis/core/layers/support/LabelClass.js";
import Query from "https://js.arcgis.com/4.32/@arcgis/core/rest/support/Query.js";
import Expand from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Expand.js";
import GraphicsLayer from "https://js.arcgis.com/4.32/@arcgis/core/layers/GraphicsLayer.js";
import * as geometryEngine from "https://js.arcgis.com/4.32/@arcgis/core/geometry/geometryEngine.js";
import * as projection from "https://js.arcgis.com/4.32/@arcgis/core/geometry/projection.js";
import SpatialReference from "https://js.arcgis.com/4.32/@arcgis/core/geometry/SpatialReference.js";

const map = new Map({
  basemap: "topo-vector",
});

const queryResultsLayer = new GraphicsLayer({
  title: "Query Results",
});
map.add(queryResultsLayer); // Add to map just like a FeatureLayer

const view = new MapView({
  container: "viewDiv",
  map: map,
  center: [-118.805, 34.027],
  zoom: 13,
});

// Renderer for trailheads
const trailheadsRenderer = {
  type: "simple",
  symbol: {
    type: "picture-marker",
    url: "http://static.arcgis.com/images/Symbols/NPS/npsPictograph_0231b.png",

    width: "18px",
    height: "18px",
  },
};

// Renderer for trails
const trailsRenderer = {
  type: "simple",
  symbol: {
    type: "simple-line",
    color: "yellow",
    width: "3px",
  },
};

const trailheadLayerClass = new LabelClass({
  labelExpressionInfo: { expression: "$feature.NAME" },
  symbol: {
    type: "text", // autocasts as new TextSymbol()
    color: "blue",
    haloSize: 1,
    haloColor: "white",
  },
});

const trailheadsLayer = new FeatureLayer({
  url: "https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/Structures_Recreation_v1/FeatureServer/1",
  title: "Trailheads",
  renderer: trailheadsRenderer,
  labelingInfo: [trailheadLayerClass],
  popupTemplate: {
    title: "{NAME}",
    content: `Source Originator: {SOURCE_ORIGINATOR}<br>Feature Code: {FCODE}<br>State: {STATE}
    <br><img src='https://bloximages.newyork1.vip.townnews.com/triplicate.com/content/tncms/assets/v3/editorial/2/b7/2b73a94c-4c61-11ee-900f-7fa48e79016e/64f7eaafea9c0.image.png' alt='' width="150" >`,
  },
});

map.add(trailheadsLayer);

const parksLayer = new FeatureLayer({
  url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0",
});

map.add(parksLayer);

const trailsLayerClass = new LabelClass({
  labelExpressionInfo: { expression: "$feature.TRL_NAME" },
  symbol: {
    type: "text",
    color: "#800080",
    haloSize: 0,
  },
});

const trailsLayer = new FeatureLayer({
  url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0",
  title: "Trails",
  renderer: trailsRenderer,
  labelingInfo: [trailsLayerClass],
  popupTemplate: {
    title: "{TRL_NAME}",
    content: `Trail ID: {TRL_ID}<br>Trail Length: {LENGTH_MI}`,
  },
});

map.add(trailsLayer);

const nearbyTrailheadsLayer = new GraphicsLayer({
  title: "Nearby Trailheads",
});
map.add(nearbyTrailheadsLayer);

//Wait for view and perform spatial linking

const legend = new Legend({
  view: view,
});

// view.ui.add(legend, "bottom-right");

const legendListExpand = new Expand({
  expandIcon: "ellipsis",
  view: view,
  content: legend,
  expanded: true,
});
view.ui.add(legendListExpand, "bottom-right");

const layerList = new LayerList({
  view: view,
});

const layerListExpand = new Expand({
  expandIcon: "layers", // see https://developers.arcgis.com/calcite-design-system/icons/
  // expandTooltip: "Expand LayerList", // optional, defaults to "Expand" for English locale
  view: view,
  content: layerList,
  expanded: true,
});
view.ui.add(layerListExpand, "top-right");

const queryExpand = new Expand({
  expandIcon: "magnifying-glass",
  view: view,
  content: document.getElementById("query"),
  expandTooltip: "Expand",
});
view.ui.add(queryExpand, "bottom-left");

// ADD EVENT LISTENTERS
//prettier-ignore
view.when(() => {
  document.getElementById("queryButton").addEventListener("click", function () {
    let currentWhere = document.getElementById("whereClause").value;
    queryFeatureLayer(currentWhere);
    
  });

  // Reset Button Listener
  document.getElementById("resetButton").addEventListener("click", function() {
    document.getElementById("viewDiv").style.height = "100%";
    document.getElementById("featureTablePH").style.height = "0";
    document.getElementById("featureTablePH").innerHTML = "";
    document.getElementById("whereClause").value = "";
  })
  
});

function queryFeatureLayer(whereClause) {
  const query = new Query();
  query.where = whereClause;
  query.outSpatialReference = { wkid: 102100 };
  query.returnGeometry = true;
  query.outFields = ["*"];

  parksLayer.queryFeatures(query).then(function (results) {
    //console.log("Results loaded", results.features); // prints the array of features to the console
    //console.log(results.features[0]);
    const features = results.features;

    // 1. Extract attributes for the table
    const attrs = results.features.map((f) => f.attributes); // Extracts attributes
    createFeatureTable(attrs, features); // Pass to table function

    // 2. Adjust layout dynamically
    document.getElementById("viewDiv").style.height = "60%";
    document.getElementById("featureTablePH").style.height = "40%";

    // 3. Clear previous graphics
    queryResultsLayer.removeAll();

    // 4. Define custom symbol for the parks (adjust as needed)
    const symbol = {
      type: "simple-fill",
      color: [34, 139, 34, 0.3], // semi-transparent forest green
      outline: {
        color: [0, 0, 0, 0.6],
        width: 1,
      },
    };

    // 5. Apply symbol to each result
    features.forEach((graphic) => {
      graphic.symbol = symbol;
    });

    // 6. Add results to map
    queryResultsLayer.addMany(features);
  });
}

function zoomToFeature(graphic) {
  if (!graphic || !graphic.geometry) return;
  // prettier-ignore
  view.goTo({
      target: graphic.geometry,
      zoom: 14,
      duration: 1000, // milliseconds
    })
    .catch((error) => {
      console.error("Zoom failed:", error);
    });
}

function flashFeature(graphic) {
  if (!graphic) return;

  // Clone the graphic to preserve the original
  const flashGraphic = graphic.clone();

  // Apply flash symbol (e.g. bright red or thicker outline)
  flashGraphic.symbol = {
    type: "simple-fill",
    color: [255, 0, 0, 0.5], //semi-transparent red
    outline: {
      color: [255, 0, 0],
      width: 2,
    },
  };

  // Add flash graphic temporarily
  queryResultsLayer.add(flashGraphic);

  // Remove flash after 800ms
  setTimeout(() => {
    queryResultsLayer.remove(flashGraphic);
    queryResultsLayer.add(graphic); // Re-add with original selection symbol
  }, 800);
}

function showNearbyTrailheads(selectedPark) {
  if (!selectedPark || !selectedPark.geometry) return;

  // Clear previous highlights
  nearbyTrailheadsLayer.removeAll();

  // Query all trailheads (no filter)
  const query = trailheadsLayer.createQuery();
  query.returnGeometry = true;
  query.outFields = ["*"];

  trailheadsLayer.queryFeatures(query).then((result) => {
    console.log("Trailheads returned:", result.features.length); // Diagnositc Step

    // Here we are always calling projection.load() BEFORE using projection.project()
    projection.load().then(() => {
      const parkSR = selectedPark.geometry.SpatialReference;

      const nearby = result.features.filter((trailhead) => {
        const projected = projection.project(trailhead.geometry, parkSR);

        const distance = geometryEngine.distance(
          selectedPark.geometry,
          projected,
          "meters"
        );

        console.log("Distance to trailhead:", distance); // Another diagnostic

        //console.log("Distance to trailhead:", distance);
        return distance <= 1609; // 1 mile
      });

      nearby.forEach((trailhead) => {
        trailhead.symbol = {
          type: "simple-marker",
          style: "circle",
          color: [0, 0, 255, 0.8],
          size: 10,
          outline: {
            color: [255, 255, 255],
            width: 1,
          },
        };
      });

      nearbyTrailheadsLayer.addMany(nearby);
      console.log(`Found ${nearby.length} trailheads within 1 mile.`);
    });
  });
}

function createFeatureTable(attrs, features) {
  console.log("Feature table function called");

  const featureTablePH = document.getElementById("featureTablePH");
  featureTablePH.innerHTML = ""; // Clear old content

  if (!attrs.length) {
    featureTablePH.innerHTML = "<p>No features found.</p>";
    return;
  }

  // Start table and add column headers
  let createdTable = "<table class='feature-table'><tr>";

  // Build table headers
  for (let key in attrs[0]) {
    createdTable += `<th>${key}</th>`;
  }
  createdTable += "<th>${key}</th>";

  // Build table rows with event hooks
  for (let i = 0; i < attrs.length; i++) {
    createdTable += `<tr data-index="${i}">`; // Attach index
    for (let key in attrs[i]) {
      createdTable += `<td>${attrs[i][key]}</td>`;
    }
    createdTable += "</tr>";
  }

  createdTable += "</tbody></table>";
  featureTablePH.innerHTML = createdTable;

  // Add event listener to each row
  const rows = featureTablePH.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    row.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      const selectedGraphic = features[index];

      queryResultsLayer.removeAll(); // Clear previous selections

      selectedGraphic.symbol = {
        type: "simple-fill",
        color: [255, 215, 0, 0.5], // gold
        outline: {
          color: [0, 0, 0],
          width: 1,
        },
      };

      //queryResultsLayer.add(selectedGraphic); // Single add

      // Call the reusable zoom function
      zoomToFeature(selectedGraphic);
      flashFeature(selectedGraphic); // Handles re-adding of the selected graphic
      trailheadsLayer.when(() => {
        showNearbyTrailheads(selectedGraphic);
      });
    });
  });
}
