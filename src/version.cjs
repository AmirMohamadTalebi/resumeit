const version=require("../package.json").version;
module.exports={version,displayVersion:version.replace("-beta"," Beta")};
