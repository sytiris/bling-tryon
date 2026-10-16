// Loaded only for Vidu. Bundle the fixed official SDK locally for MV3.
window.AliRtcOptionsDisableProxy = true;
const { default: Engine } = await import('aliyun-rtc-sdk');
Engine.setLogLevel(Engine.AliRtcLogLevel.NONE);
export default Engine;
