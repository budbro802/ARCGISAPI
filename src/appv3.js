import Map from "https://js.arcgis.com/4.29/@arcgis/core/Map.js";
import MapView from "https://js.arcgis.com/4.29/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.29/@arcgis/core/layers/FeatureLayer.js";
import Legend from "https://js.arcgis.com/4.29/@arcgis/core/widgets/Legend.js";
import LayerList from "https://js.arcgis.com/4.29/@arcgis/core/widgets/LayerList.js";
import LabelClass from "https://js.arcgis.com/4.29/@arcgis/core/layers/support/LabelClass.js";
import * as geometryEngine from "https://js.arcgis.com/4.29/@arcgis/core/geometry/geometryEngine.js";

// Creating the basemap
const map = new Map({
  basemap: "topo-vector",
});

// Initalizing the view
const view = new MapView({
  container: "viewDiv",
  map: map,
  center: [-118.805, 34.027],
  zoom: 13,
});

// Add the trails layer
const trailsLayer = new FeatureLayer({
  url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0",
  outFields: ["TRL_NAME"],
  title: "Trails",
});

map.add(trailsLayer);

// Add the trailheads layer
const trailheadsLayer = new FeatureLayer({
  url: "https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/Structures_Recreation_v1/FeatureServer/1",
  outFields: ["*"],
  title: "Trailheads",
});

map.add(trailheadsLayer);

const parksLayer = new FeatureLayer({
  url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0",
});

map.add(parksLayer);

// Once view and layers are ready, begin spatial linking and setup

view.when(async () => {
  // Everything inside here happens *after* the view is ready
  await trailheadsLayer.when();
  await trailsLayer.when();

  const [trailheadsQueryResult, trailsQueryResult] = await Promise.all([
    trailheadsLayer.queryFeatures({
      where: "1=1",
      outFields: ["*"],
      returnGeometry: true,
    }),
    trailsLayer.queryFeatures({
      where: "1=1",
      outFields: ["TRL_NAME"],
      returnGeometry: true,
    }),
  ]);

  // Add const values for trailheads and trails!!!

  const trailheads = trailheadsQueryResult.features;
  const trails = trailsQueryResult.features;

  // Loop through and assign nearest trail names
  trailheads.forEach((trailhead) => {
    let nearestTrail = null;
    let minDistance = Infinity;

    // prettier-ignore
    trails.forEach((trail) => {
      
      if (!trailhead.geometry) console.warn("Missing geometry for trailhead:", trailhead);
      if (!trail.geometry) console.warn("Missing geometry for trail:", trail);

      
      const distance = geometryEngine.distance(trailhead.geometry, trail.geometry, "meters");
      if (distance < minDistance) {
        minDistance = distance;
        nearestTrail = trail;
      }
    });

    // prettier-ignore
    trailhead.attributes.NearestTRL = nearestTrail?.attributes?.TRL_NAME || "Unknown";
  });

  // Apply labeling
  trailheadsLayer.popupTemplate = {
    title: "{NearestTRL}",
    content: `Nearest Trail: {NearestTRL}<br>Building Name: {ADDRESSBUILDINGNAME}<br>State: {STATE}`,
  };

  trailheadsLayer.labelingInfo = [
    new LabelClass({
      labelExpressionInfo: { expression: "$feature.NearestTRL" },
      symbol: {
        type: "text",
        color: "black",
        haloColor: "white",
        haloSize: "1px",
        font: {
          size: 12,
          family: "Arial",
        },
      },
    }),
  ];

  // Refresh the layer
  trailheadsLayer.refresh();
});

//Wait for view and perform spatial linking

const legend = new Legend({
  view: view,
});

view.ui.add(legend, "bottom-right");

const layerList = new LayerList({
  view: view,
});

// Adds widget below other elements in the top left corner of the view
view.ui.add(layerList, {
  position: "top-right",
});
