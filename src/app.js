import Map from "https://js.arcgis.com/4.29/@arcgis/core/Map.js";
import MapView from "https://js.arcgis.com/4.29/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/4.29/@arcgis/core/layers/FeatureLayer.js";
import OAuthInfo from "https://js.arcgis.com/4.29/@arcgis/core/identity/OAuthInfo.js";
import esriId from "https://js.arcgis.com/4.29/@arcgis/core/identity/IdentityManager.js";

const portalUrl = "https://www.arcgis.com";

//prettier-ignore

// Step 1: Define OAuth Info
const info = new OAuthInfo({
  appId: "nEo6zsW7p9VyYojz",
  portalUrl: portalUrl,
  popup: true
});
esriId.registerOAuthInfos([info]);

esriId
  .checkSignInStatus(portalUrl + "/sharing")
  .then(() => {
    console.log("Signed in!");
    loadMap(); // Load map only after authentication
  })
  .catch(() => {
    console.log("User not signed in, prompting sign-in...");
    esriId.signIn().then(() => {
      console.log("Signed in after prompt");
      loadMap(); // Load map after user logs in
    });
  });

// STEP 2
function loadMap() {
  const map = new Map({
    basemap: "topo-vector",
  });

  // STEP 3
  //Trailheads feature layer (points)
  const trailheadsLayer = new FeatureLayer({
    url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0",
  });

  map.add(trailheadsLayer);

  // STEP 4 - View
  const view = new MapView({
    map: map,
    container: "viewDiv",
    zoom: 10,
    //extent: initialExtent,
    // will override zoom
    // map will be centered at [0,0], but the scale from initialExtent will be used
    center: [-118.80543, 34.072],
  });
}
