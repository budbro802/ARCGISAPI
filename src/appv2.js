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
import Sketch from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Sketch.js";
import Graphic from "https://js.arcgis.com/4.32/@arcgis/core/Graphic.js";
import Bookmarks from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Bookmarks.js";
import BasemapGallery from "https://js.arcgis.com/4.32/@arcgis/core/widgets/BasemapGallery.js";
import Print from "https://js.arcgis.com/4.32/@arcgis/core/widgets/Print.js";

const queryGeometries = [];
const queryParkNames = [];

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

let bookmarksWidgetCreated = false;
let basemapWidgetCreated = false;
let printWidgetCreated = false;

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

const sketchLayer = new GraphicsLayer({
  title: "Sketch Layer",
});
map.add(sketchLayer); // Add to the map so we can see what the user draws

const intersectingParksLayer = new GraphicsLayer({
  title: "Intersecting Parks",
});
map.add(intersectingParksLayer);

const sketch = new Sketch({
  layer: sketchLayer,
  view: view,
  container: "sketchDiv",
  availableCreateTools: ["polygon", "rectangle"],
  creationMode: "single", // Only allow one shape at a time
  visibleElements: {
    createTools: {
      point: false,
      polyline: false,
      circle: false,
    },
    selectionTools: {
      "rectangle-selection": false,
      "lasso-selection": false,
    },
  },
});

//view.ui.add(sketch, "top-right");

const highlightSymbol = {
  type: "simple-fill",
  color: [255, 0, 0, 0.2], // Red with transparency
  outline: {
    color: [255, 0, 0],
    width: 2,
  },
};

sketch.on("create", function (event) {
  // Step 1: Clear any previous drawings by the user
  sketchLayer.removeAll();

  // Step 2: Clear any previously highlighted intersecting parks
  intersectingParksLayer.removeAll(); // clear all previous highlights

  // Step 3: Wait until the drawing if complete
  if (event.state === "complete") {
    // Get the geometry of the user-drawn shape
    const drawnGeometry = event.graphic.geometry;

    // Store it in the sketchLayer for visual reference
    sketchLayer.add(event.graphic);

    // Step 4: Perform spatial analysis using intersects()
    const intersectingParks = [];

    queryGeometries.forEach((parkGeometry, index) => {
      if (geometryEngine.intersects(drawnGeometry, parkGeometry)) {
        const parkName = queryParkNames[index];
        if (!intersectingParks.includes(parkName)) {
          intersectingParks.push(parkName);
          //console.log("Added park:", parkName);

          // Highlight the intersecting park on the map
          const highlightGraphic = new Graphic({
            geometry: parkGeometry,
            symbol: {
              type: "simple-fill",
              color: [0, 255, 255, 0.4],
              outline: { color: "black", width: 1 },
            },
          });
          // Add it to the layer
          intersectingParksLayer.add(highlightGraphic);
        }
      }
    });

    // Populate the HTML list
    const listContainer = document.getElementById("intersectListContainer");
    const list = document.getElementById("intersectList");
    list.innerHTML = ""; // Clear previous results

    // Step 5: Display results in the console and HTML list
    if (intersectingParks.length > 0) {
      intersectingParks.forEach((name) => {
        console.log("Rendering name:", name);

        const li = document.createElement("li");
        li.textContent = name;
        list.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No intersecting parks.";
      list.appendChild(li);
    }
  }
});

//Wait for view and perform spatial linking

const legend = new Legend({
  view: view,
  container: "legendDiv",
});

// view.ui.add(legend, "bottom-right");

// const legendListExpand = new Expand({
//   expandIcon: "ellipsis",
//   view: view,
//   content: legend,
//   expanded: true,
// });
// view.ui.add(legendListExpand, "bottom-right");

const layerList = new LayerList({
  view: view,
  container: "layerListDiv", // This attaches it inside the panel
});

const queryExpand = new Expand({
  expandIcon: "magnifying-glass",
  view: view,
  content: document.getElementById("query"),
  expandTooltip: "Expand",
});
view.ui.add(queryExpand, "bottom-left");

// Bookmarks widget
const bookmarks = new Bookmarks({
  view: view,
  container: "bookmarksDiv",
  editingEnabled: false, // Set to true if users are allowed to add/edit bookmarks
});

const bookmarksExpand = new Expand({
  view: view,
  content: bookmarks,
  expandIcon: "bookmark",
  expanded: false,
});
//view.ui.add(bookmarksExpand, "top-left");

// Basemap Gallery Widget
const BasemapGalleryWidget = new BasemapGallery({
  view: view,
  container: "basemapGalleryDiv",
});

const basemapExpand = new Expand({
  view: view,
  content: BasemapGalleryWidget,
  expandIcon: "basemap",
  expanded: false,
});

// Print Widget
const printWidget = new Print({
  view: view,
  container: "printDiv",
});

// ADD EVENT LISTENTERS
//prettier-ignore
view.when(() => {
  
  const query = parksLayer.createQuery();
  query.where = "1=1";
  query.returnGeometry = true;
  query.outFields = ["PARK_NAME"];

  parksLayer.queryFeatures(query).then((result) => {
    queryGeometries.length = 0;
    queryParkNames.length = 0;

    result.features.forEach((feature) => {
      queryGeometries.push(feature.geometry);
      queryParkNames.push(feature.attributes.PARK_NAME);
    });

    console.log("Parks loaded:", queryGeometries.length);
    console.log("Loaded parks:", queryParkNames);
  });

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
    document.getElementById("trailheadCount").textContent = ""; // Clear the count
    document.getElementById("trailheadCount").style.display = "none";
    queryResultsLayer.removeAll(); // Clear parks
    nearbyTrailheadsLayer.removeAll(); // Clear Trailheads
  })

  document.getElementById("clearButton").addEventListener("click", () => {
    // Clear graphics from each custom GraphicsLayer
    sketchLayer.removeAll();
    intersectingParksLayer.removeAll();

    // Clear HTML results list
    document.getElementById("intersectList").innerHTML = "";

    // Optionally rest styling or view height if changed
    console.log("Sketch and intersecting layers cleared.")
  }
  )
  
});

document.addEventListener("DOMContentLoaded", function () {
  //const shellPanel = document.querySelector("calcite-shell-panel");
  const calcitePanel = document.querySelector("calcite-panel");

  // Handle toggle button clicks
  Object.keys(actions).forEach((actionId) => {
    const button = document.getElementById(actionId);
    if (button) {
      button.addEventListener("click", () => handlePanelToggle(actionId));
    }
  });
});

const actions = {
  legendAction: "legendDiv",
  bookmarksAction: "bookmarksDiv",
  basemapAction: "basemapGalleryDiv",
  printAction: "printDiv",
  layerListAction: "layerListDiv",
  legendAction: "legendDiv",
  sketchAction: "sketchDiv",
  queryAction: "queryDiv",
  info: "infoDiv",
};

let currentActiveAction = null;

function handlePanelToggle(actionId) {
  // const shellPanel = document.querySelector("calcite-shell-panel");

  // const panel = document.querySelector("calcite-panel");
  const panelWidgets = document.querySelectorAll(".floating-widget");
  const widgetId = actions[actionId];
  const widget = document.getElementById(widgetId);
  // const viewDiv = document.getElementById("viewDiv");
  if (!widget) return;

  // if (!shellPanel || !panel || !widget) return;

  // If clicking the same active action again then collapse then panel
  if (currentActiveAction === actionId) {
    // shellPanel.setAttribute("collapsed", "");
    // panel.setAttribute("hidden", "");
    // panelWidgets.forEach((div) => div.classList.remove("active"));
    widget.classList.add("hidden");
    currentActiveAction = null;

    // Remove margin when panel collapses
    // viewDiv.classList.remove("with-panel");
    return;
  }

  // Otherwise expand the panel and show the correct widget
  // shellPanel.removeAttribute("collapsed");
  // panel.removeAttribute("hidden");
  panelWidgets.forEach((div) => div.classList.remove("active"));
  // widget.classList.add("active");
  widget.classList.remove("hidden");
  currentActiveAction = actionId;

  console.log("Toggling:", actionId, widgetId, widget);
}

function queryFeatureLayer(whereClause) {
  const query = new Query();
  query.where = whereClause;
  query.outSpatialReference = { wkid: 102100 };
  query.returnGeometry = true;
  query.outFields = ["*"];

  parksLayer.queryFeatures(query).then(function (results) {
    const features = results.features;

    // 1. Extract attributes for the table
    const attrs = results.features.map((f) => f.attributes); // Extracts attributes
    createFeatureTable(attrs, features); // Pass to table function

    // 2. Adjust layout dynamically
    document.getElementById("viewDiv").style.height = "calc(100vh - 280px)";
    document.getElementById("featureTablePH").style.height = "280px";

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
  console.log("Selected park:", selectedPark.attributes?.PARK_NAME);

  if (!selectedPark || !selectedPark.geometry) return;

  // Clear previous highlights
  nearbyTrailheadsLayer.removeAll();

  // Query all trailheads (no filter)
  const query = trailheadsLayer.createQuery();
  query.returnGeometry = true;
  query.outFields = ["*"];

  trailheadsLayer.queryFeatures(query).then((result) => {
    //console.log("Trailheads returned:", result.features.length); // Diagnositc Step

    // Here we are always calling projection.load() BEFORE using projection.project()
    projection.load().then(() => {
      const parkSR = selectedPark.geometry.spatialReference;

      const nearby = result.features.filter((trailhead) => {
        const projected = projection.project(trailhead.geometry, parkSR);
        if (!projected) {
          // prettier-ignore
          console.warn("Projected failed for trailhead:", trailhead.attributes?.NAME);
          return false;
        }

        // prettier-ignore
        const distance = geometryEngine.distance(selectedPark.geometry,projected, "meters");

        const name = trailhead.attributes?.NAME || "Unnamed";

        console.log({
          park: selectedPark.attributes?.PARK_NAME,
          trailhead: name,
          parkGeometry: selectedPark.geometry,
          distance: distance?.toFixed(2),
          inRange: distance <= 1609,
        });

        //console.log("Distance to trailhead:", distance);
        //return distance <= 1609; // 1 mile

        // Temporarily loosen the Range to see if any trailheads are detected
        return distance <= 5000; // 5km range
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

      const countDiv = document.getElementById("trailheadCount");
      countDiv.textContent = `Trailheads within 1 mile: ${nearby.length}`;
      countDiv.style.display = "block"; // Show it only when populated

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
  //createdTable += "<th>${key}</th>";
  createdTable += "</tr>";

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
      // prettier-ignore
      console.log("Calling showNearbyTrailheads for:", selectedGraphic.attributes?.PARK_NAME);
      trailheadsLayer.when(() => {
        showNearbyTrailheads(selectedGraphic);
      });
    });
  });
}
