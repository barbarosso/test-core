
/**
 * Created by pascal on 01/11/15.
 */
var _ = require('lodash');
function getNPMPackageIds() {
    // read package.json and get dependencies' package ids
    var packageManifest = {};
    try {
        packageManifest = require('../../package.json');
    } catch (e) {
        // does not have a package.json manifest
    }
    return _.keys(packageManifest.dependencies) || [];

}

module.exports.getNPMPackageIds = getNPMPackageIds
