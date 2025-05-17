require([
  "esri/Map",
  "esri/views/MapView",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
], function (Map, MapView, OAuthInfo, esriId) {
  const portalUrl = "https://www.arcgis.com";

  const info = new OAuthInfo({
    appId: "nEo6zsW7p9VyYojz",
    portalUrl: portalUrl,
    popup: true,
  });

  esriId.registerOAuthInfos([info]);

  // 🔁 Instead of checking for session, directly call signIn()
  esriId
    .signIn()
    .then(() => {
      console.log("Signed in successfully!");

      // If sign-in works, now create and load the map
      const map = new Map({
        basemap: "topo-vector",
      });

      const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [-118.80543, 34.072],
        zoom: 10,
      });
    })
    .catch((err) => {
      console.error("Sign-in failed:", err);
    });
});
