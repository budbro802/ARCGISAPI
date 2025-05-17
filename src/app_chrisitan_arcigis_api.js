require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/PopupTemplate",
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/layers/support/LabelClass",
  "esri/rest/support/Query",
  "esri/widgets/Expand",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Sketch",
  "esri/geometry/geometryEngine",
  "esri/widgets/Bookmarks",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Print",
  "esri/rest/support/StatisticDefinition"
], function(esriConfig, Map, MapView, FeatureLayer, PictureMarkerSymbol, PopupTemplate, Legend, LayerList, LabelClass, Query, Expand, GraphicsLayer, Sketch, geometryEngine, Bookmarks, BasemapGallery, Print, StatisticDefinition) {
  let queriedGeometries = [];
  let queriedParkNames = [];
  esriConfig.apiKey = "AAPKd2203653e15a47e08a6417700131c200X8IixU2V5XXNR20gUfQxaxZeuoM_9U7DAhwmK8gikrmdIfqlRRLibZ_RVPn7DFLa";

  // STEP 2 - map
  const map = new Map({ basemap: "arcgis-topographic" });

  // renderer for trailheads
  let trailheadSymbol = new PictureMarkerSymbol({
    url: "http://static.arcgis.com/images/Symbols/NPS/npsPictograph_0231b.png",
    width: "18px",
    height: "18px"
  });  
  const trailheadsRenderer = {
    "type": "simple",
    "symbol": {
      "type": "picture-marker",
      "url": "http://static.arcgis.com/images/Symbols/NPS/npsPictograph_0231b.png",
      "width": "18px",
      "height": "18px"
    }
  }

  // renderer for trails
  let trailSymbol = { type: "simple-line", width: 1, color: [164, 59, 175, 1] };
  const trailsRenderer = {
    "type": "simple",
    "symbol": trailSymbol
  }

  // Popuptemplate for trailheads
  let trailheadPT = new PopupTemplate({
    title: "Name of Trail: {TRL_NAME}",
    content: "The Trail head is in the park {PARK_NAME}" +
             '<img src="http://127.0.0.1:5500/img/ArcGIS.JPG" alt="Santa Monica Mountains" width="300">'
  });

  // Labeling
  const trailheadsLabelClass = new LabelClass({
    labelExpressionInfo: { expression: "$feature.TRL_NAME" },
    symbol: {
      type: "text",  // autocasts as new TextSymbol()
      color: "black",
      haloSize: 1,
      haloColor: "white"
    }
  });  

  // STEP 3 - feature layers
  //Trailheads feature layer (points)
  //Trails feature layer (lines)
  const trailsLayer = new FeatureLayer({
    renderer: trailsRenderer,
    url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0"
  });
  trailsLayer.title = "Trails";
  
  const trailheadsLayer = new FeatureLayer({
    popupTemplate: trailheadPT,
    renderer: trailheadsRenderer,
    labelingInfo: [ trailheadsLabelClass ],
    title: "Trailheads",
    url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0"
  });

  const parksLayer = new FeatureLayer({
    url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0"
  });

  const graphicsLayer = new GraphicsLayer({
    title: "Graphic Layer",
    listMode: "hide"
  });

  map.add(parksLayer);
  map.add(trailsLayer);
  map.add(trailheadsLayer);
  map.add(graphicsLayer);

  // STEP 4 - view 2D is MapView (3D SceneView)
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-118.80543,34.02700],
    zoom: 13,
    padding: {
      left: 49
    }
  });

  let legend = new Legend({
    view: view,
    container: "legend-container"
  });
  /*let legendExpand = new Expand({
    expandIconClass: "esri-icon-legend",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
    // expandTooltip: "Expand LayerList", // optional, defaults to "Expand" for English locale
    view: view,
    content: legend,
    expanded: false,
    expandTooltip: "This is the Legend"
  });
  view.ui.add(legendExpand, "bottom-right");*/

  let layerList = new LayerList({
    view: view,
    container: "layers-container"
  });
  /*let layerListExpand = new Expand({
    expandIconClass: "esri-icon-layer-list",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
    // expandTooltip: "Expand LayerList", // optional, defaults to "Expand" for English locale
    view: view,
    content: layerList
  });
  view.ui.add(layerListExpand, "top-right");*/

  let chartExpand = new Expand({
    expandIconClass: "esri-icon-chart",
    view: view,
    content: document.getElementById("chartWrapper")
  });
  view.ui.add(chartExpand, "top-right");

  // WIDGETS
  const basemaps = new BasemapGallery({
    view,
    container: "basemaps-container"
  });
  const bookmarks = new Bookmarks({
    view,
    container: "bookmarks-container"
  });
  const print = new Print({
    view,
    container: "print-container"
  });

  view.when(() => {
    //const { title, description, thumbnailUrl, avgRating } = map.portalItem;
    document.querySelector("#header-title").textContent = "My Amazing WebGIS";
    document.querySelector("#item-description").innerHTML = "This map can do queries and so on!";
    document.querySelector("#item-thumbnail").src = map.basemap.thumbnailUrl;
    document.querySelector("#item-rating").value = 5;

    let activeWidget;

    const handleActionBarClick = ({ target }) => {
      if (target.tagName !== "CALCITE-ACTION") {
        return;
      }

      if (activeWidget) {
        document.querySelector(`[data-action-id=${activeWidget}]`).active = false;
        document.querySelector(`[data-panel-id=${activeWidget}]`).hidden = true;
      }

      const nextWidget = target.dataset.actionId;
      if (nextWidget !== activeWidget) {
        document.querySelector(`[data-action-id=${nextWidget}]`).active = true;
        document.querySelector(`[data-panel-id=${nextWidget}]`).hidden = false;
        activeWidget = nextWidget;
      } else {
        activeWidget = null;
      }
    };

    document.querySelector("calcite-action-bar").addEventListener("click", handleActionBarClick);

    let actionBarExpanded = false;

    document.addEventListener("calciteActionBarToggle", event => {
      actionBarExpanded = !actionBarExpanded;
      view.padding = {
        left: actionBarExpanded ? 150 : 45
      };
    });
  });


  // SKETCH
  const sketch = new Sketch({
    container: "spatial-analysis-container",
    view: view,
    layer: graphicsLayer,
    updateOnGraphicClick: true,
    snappingOptions: {
        enabled: true,
        featureSources: [{
            layer: graphicsLayer
        }]
    },
    visibleElements: {
        createTools: {
            point: false,
            polyline: false,
            circle: false
        },
        selectionTools: {
            "lasso-selection": false,
            "rectangle-selection": false,
        },
        settingsMenu: false,
        undoRedoMenu: false
    }
  });
  //view.ui.add(sketch, "top-right");

  sketch.on("create", (event) => {
    if (event.state === "start") {
      console.log("start");
      graphicsLayer.removeAll();
    }
    if (event.state === "complete") {
      console.log("complete");
      let drawnGeometry = event.graphic.geometry;
      // get the names from queriedParkNames
      let intersectingParks = [];
      for (let i = 0; i < queriedGeometries.length; ++i) {
        const isIntersecting = geometryEngine.intersects(queriedGeometries[i], drawnGeometry);
        if (!isIntersecting)
          continue;
        
        intersectingParks.push(queriedParkNames[i]);
        console.log(queriedParkNames[i]);
      }
    }
  });




  ////////////////////////////////////// event listeners
  document.getElementById("queryButton").addEventListener("click", function() {
    let currentWhere = document.getElementById("whereClause").value;
    queryFeatureLayer(currentWhere);
    queryFeatureLayerCount(currentWhere);

    let viewDivElement = document.getElementById("viewDiv");
    let featTableElement = document.getElementById("featureTablePH");
    viewDivElement.style.height = "60%";
    featTableElement.style.height = "40%";
  });

  function queryFeatureLayerCount(whereClause) {
    const query = new Query();
    query.where = whereClause;
    query.outSpatialReference = { wkid: 102100 };
    query.returnGeometry = false;
    query.outFields = [ "*" ];
    let statisticDefinition = new StatisticDefinition({
      statisticType: "count",
      onStatisticField: "AGNCY_TYP",
      outStatisticFieldName: "AGNCY_TYPCOUNT"
    });
    query.outStatistics = [ statisticDefinition ];
    query.groupByFieldsForStatistics = [ "AGNCY_TYP" ];

    parksLayer.queryFeatures(query)
    .then(function(response) {
      console.log(response);
      let xValues = [];//"Italy", "France", "Spain", "USA", "Argentina"];
      let yValues = [];//55, 49, 44, 24, 15];
      for (let i = 0; i < response.features.length; ++i) {
        let cf = response.features[i];
        xValues.push(cf.attributes["AGNCY_TYP"]);
        yValues.push(cf.attributes["AGNCY_TYPCOUNT"]);
      }

      new Chart("myChart", {
        type: "bar",
        data: {
          labels: xValues,
          datasets: [{
            backgroundColor: "blue",
            data: yValues
          }]
        },
        options: {
          legend: {display: false},
          title: {
            display: true,
            text: "Agency Types"
          },
          maintainAspectRatio: false
        }
      });

      chartExpand.expand();
    });
  }

  function queryFeatureLayer(whereClause) {
    const query = new Query();
    query.where = whereClause;
    query.outSpatialReference = { wkid: 102100 };
    query.returnGeometry = true;
    query.outFields = [ "*" ];

    parksLayer.queryFeatures(query)
    .then(function(featureSet) {
      createFeatureTable(featureSet);

      for (let i = 0; i < featureSet.features.length; ++i)
        featureSet.features[i].symbol = { type: "simple-fill", color: [59, 160, 191, 0.58] };

      view.graphics.addMany(featureSet.features);
    },
    function(error) {
      alert(error);
    });

  }

  function zoomTo(position) {
    view.goTo(queriedGeometries[position], { duration: 1000 });
  }

  function createFeatureTable(featureSet) {
    queriedGeometries = [];
    queriedParkNames = [];
    let featureTablePH = document.getElementById("featureTablePH");
    let queriedFeatures = featureSet.features;

    let createdTable = "<table>";
    for (let i = 0; i < queriedFeatures.length; ++i) {
      let attrOfCurrentFeature = featureSet.features[i].attributes;
      if (i === 0) {
        createdTable += "<tr>";
        for (let currentKey in attrOfCurrentFeature) {
          createdTable += "<th>" + currentKey + "</th>";
        }
        createdTable += "</tr>";
      }

      queriedGeometries.push(featureSet.features[i].geometry);
      queriedParkNames.push(attrOfCurrentFeature["PARK_NAME"]);
      createdTable += "<tr id='feature-" + i + "'>";
      for (let currentKey in attrOfCurrentFeature) {
        createdTable += "<td>" + attrOfCurrentFeature[currentKey] + "</td>";
      }
      createdTable += "</tr>";
    }
    createdTable += "</table>";
    featureTablePH.innerHTML = createdTable;

    for (let i = 0; i < queriedFeatures.length; ++i) {
      document.getElementById("feature-" + i).addEventListener("click", function() {
        zoomTo(i);
      });
    }
  }

  //document.querySelector("calcite-shell").hidden = false;
  document.querySelector("calcite-loader").hidden = true;

  /*
  <table>
    <tr>
      <th>Company</th>
      <th>Contact</th>
      <th>Country</th>
    </tr>
    <tr>
      <td>Alfreds Futterkiste</td>
      <td>Maria Anders</td>
      <td>Germany</td>
    </tr>
  </table>
  */

  // Exercise: Find all queried parks in a custom drawn polyon
  // What do/should we have: queried polygons
  // What are the steps to achieve this:
  // 1. Bringing in a Graphics Layer
  // 2. Sketch Widget (with just the option to draw polygons) for that Graphics Layer
  // 3. Delete new old drawn polygons when a new one gets drawn
  // 4. When user draws a polygon and completes
  // 5. Then Check which parks (let queriedGeometries = [];) are inside that polygon
  // 6. Create a list with that parks (queriedParkNames)
});
