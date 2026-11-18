import {init,loadSettings,getData,subscribe} from './tableau.js';import {renderCard,renderState} from './render.js';import {mergeDefaults} from './defaults.js';
const root=document.querySelector('#app');
async function draw(){try{const settings=loadSettings();let data;if(globalThis.tableau?.extensions?.worksheetContent){data=await getData();}else{data={metric1:{formattedValue:'48,339',fieldName:'Main Marks'},metric2:{formattedValue:'33,234,770',fieldName:'Weight (lb)'}};}renderCard(root,settings,data);}catch(e){renderState(root,'Configure Quick KPI Card',e.message);}}
try{await init();await draw();subscribe(draw);}catch(e){renderState(root,'Quick KPI Card could not initialize',e.message);}
