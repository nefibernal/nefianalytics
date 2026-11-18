export const DEFAULTS = Object.freeze({
 schemaVersion:1,
 card:{backgroundColor:'#FFFFFF',borderEnabled:false,borderColor:'#666666',borderWidth:0,borderRadius:0,padding:4,shadowEnabled:false},
 header:{text:'Quick KPI Card',backgroundColor:'#5B78A8',fontColor:'#FFFFFF',fontSize:16,fontWeight:700,alignment:'center'},
 icon:{visible:false,id:'production',color:'#FFFFFF',size:18,position:'header-left'},
 metric1:{label:'Primary Metric',useFieldName:true,valueFontColor:'#333333',valueFontSize:24,valueFontWeight:400,labelFontColor:'#888888',labelFontSize:14,labelFontWeight:400,alignment:'center',backgroundColor:'#FFFFFF',padding:8,prefix:'',suffix:''},
 metric2:{label:'Secondary Metric',useFieldName:true,valueFontColor:'#333333',valueFontSize:16,valueFontWeight:400,labelFontColor:'#888888',labelFontSize:13,labelFontWeight:400,alignment:'center',backgroundColor:'#F5F5F5',padding:6,prefix:'',suffix:'',dividerVisible:true,dividerColor:'#D4D4D4',dividerWidth:1}
});
export function mergeDefaults(saved={}) { return { ...DEFAULTS, ...saved, card:{...DEFAULTS.card,...saved.card},header:{...DEFAULTS.header,...saved.header},icon:{...DEFAULTS.icon,...saved.icon},metric1:{...DEFAULTS.metric1,...saved.metric1},metric2:{...DEFAULTS.metric2,...saved.metric2} }; }
