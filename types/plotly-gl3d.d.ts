/**
 * Prebuilt plotly.js bundle (scatter3d etc.) — not covered by @types/plotly.js paths.
 */
declare module 'plotly.js/dist/plotly-gl3d' {
  import * as Plotly from 'plotly.js'

  const PlotlyGL: typeof Plotly
  export default PlotlyGL
}
