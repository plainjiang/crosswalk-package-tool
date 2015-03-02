// Copyright © 2014 Intel Corporation. All rights reserved.
// Use  of this  source  code is  governed by  an Apache v2
// license that can be found in the LICENSE-APACHE-V2 file.

var Config = null;
var Console = null;
var Downloader = null;
var Shell = require ("shelljs");
var Path = require ('path');

/**
 * Interface for project implementations.
 * @constructor
 * @protected
 */
function DebProject(application) {
    this._application = application;
    if (typeof(application) != 'undefined' && application != null) {
        Config = typeof(application.getConfig) != 'function'?null:application.getConfig();
        Console = typeof(application.getConsole) != 'function'?console:application.getConsole();
    } else {
        Console = console;
    }
}

DebProject.prototype.isCrosswalkProject = function () {
    var current_dir = Shell.pwd();
    if (Shell.test('-d', Path.join(current_dir, 'src', 'xwalk'))) {
        return true;
    }
    return false;
}

DebProject.prototype.getVersion = function (version_file) {
    var str = Shell.cat(version_file);
    var ret = {};
    ret.major = str.match(/MAJOR\s*=\s*[0-9]+/)[0].replace(/MAJOR\s*=\s*/, "");
    ret.minor = str.match(/MINOR\s*=\s*[0-9]+/)[0].replace(/MINOR\s*=\s*/, "");
    ret.build = str.match(/BUILD\s*=\s*[0-9]+/)[0].replace(/BUILD\s*=\s*/, "");
    ret.patch = str.match(/PATCH\s*=\s*[0-9]+/)[0].replace(/PATCH\s*=\s*/, "");
    return ret;
}

DebProject.prototype.GenerateDebianConfig = function (version, debian_dir) {
    Shell.pushd(debian_dir);
    // Create changelog here
    var version_str = [version.major, version.minor, version.build, version.patch].join('.')
         + '-' + version.deb_version;
    Shell.exec(['debchange -c', Path.join(debian_dir, 'changelog'), '-v', version_str, "Upgrade"].join(' '));
    Shell.popd();
}

/**
 * Generate project template.
 * @function generate
 * @param {String} deb_version_ Package subversion
 * @param {Function} callback see {@link Project~projectOperationCb}.
 * @abstract
 * @memberOf Project
 */
DebProject.prototype.generate =
function(deb_version_, callback) {
    var deb_version = deb_version_ || 1;
    Console.log("DebProject: Generating " + deb_version);

    if (!this.isCrosswalkProject()) {
        Console.log("It's not a Crosswalk project.");
        return;
    }
    var project_dir = Shell.pwd();
    var version = this.getVersion(Path.join(project_dir, 'src', 'xwalk', 'VERSION'));
    version.deb_version = deb_version;

    var template_dir = Path.join(__dirname, '..', 'data', 'debian');
    var debian_dir = Path.join(project_dir, 'src', 'debian');
    if (Shell.test('-d', debian_dir)) {
        Shell.rm('-rf', debian_dir);
    }
    Shell.cp('-Rf', template_dir, Path.join(project_dir, 'src'));

    this.GenerateDebianConfig(version, debian_dir);

    var version_str = [version.major, version.minor, version.build, version.patch].join('.');
    var tar_name = 'crosswalk_' + version_str + '.orig.tar.gz';
    var build_dir = Path.join(project_dir, 'deb_package');
    var target = Path.join(build_dir, tar_name);

    if (Shell.test('-d', build_dir)) {
        Shell.rm('-rf', build_dir);
    }
    Shell.mkdir('-p', build_dir);

    var cmd = ['tar zcf', target,
                "--exclude-vcs --exclude=android_tools --exclude=native_client --exclude=LayoutTests --exclude=src/out",
               "--exclude='*.pyc'", "--exclude='*.o'", '--transform="s:^src:crosswalk-' + version_str + '-' + deb_version + ':S"', 'src/'].join(' ');
    Console.log(cmd);
    Shell.exec(cmd);

    Shell.rm('-rf', debian_dir);
    // Null means success, error string means failure.
    callback(null);
};

DebProject.prototype.update =
function(callback) {

    // TODO implement updating of project to new Crosswalk version.
    // This function is not supported yet.
    Console.log("DebProject: Updating project has not implemented.");

    // Null means success, error string means failure.
    callback(null);
};

DebProject.prototype.refresh =
function(callback) {

    // TODO implement updating of project to new Crosswalk version.
    // Maybe this function will be not needed, and removed in the future.
    Console.log("DebProject: Refreshing project has not implemented.");

    // Null means success, error string means failure.
    callback(null);
};

/**
 * Build application package.
 * @function build
 * @param {String[]} abi Array of ABIs, supported i386, X86_64.
 * @param {Boolean} release Whether to build debug or release package.
 * @param {Function} callback see {@link Project~projectOperationCb}.
 * @abstract
 * @memberOf Project
 */
DebProject.prototype.build =
function(abis, release, callback) {

    // TODO implement updating of project to new Crosswalk version.
    Console.log("DebProject: Building project");

    var Fs = require ('fs');

    var project_dir = Shell.pwd();
    var build_dir = Path.join(project_dir, 'deb_package');
    Shell.pushd(build_dir);
    var orig_package = Shell.ls('crosswalk_*.orig.tar.gz')[0] || null;
    if (orig_package != null) {
        var package_dir = Shell.ls(orig_package.replace(/_/, '-').replace(/.orig.tar.gz/, '-*'))[0] || null;
        if (Shell.test('-d', package_dir))
            Shell.rm('-rf', package_dir);
        Shell.exec(['tar xf', orig_package].join(' '));
        if (package_dir != null && Shell.test('-d', package_dir)) {
            Shell.pushd(package_dir);
            Shell.exec(['debuild -us -uc'].join(' '));
            Shell.popd();
        }
    }
    Shell.popd();
    // Null means success, error string means failure.
    callback(null);
};

module.exports = DebProject;