#!/usr/bin/env node

const path = require("path");
const _ = require("lodash");
const logger = require("pino")({
    prettyPrint: { colorize: true },
    translateTime: false
});
const async = require("async");
const {
    getRepoFolder,
    getLastCommitHash,
    getAllCommits,
    checkoutToCommit,
    getPackageChecksum
} = require("@feedzai/analyzer-utilities");
const { installRepo, installRepoSync, getRepoName } = require("@feedzai/analyzer-utilities/repoMethods");
const { getMetricsForRepo, } = require("@feedzai/analyzer-utilities/metricsMethods");
const configs = require("/configs");
const { report } = require("./reporters");
const ncp = require('ncp').ncp;
const rimraf = require('rimraf');
const argv = require("yargs").argv;
const elastic = require("./elastic");

/**
 * index
 *
 * Controls the main execution.
 *
 * @author Luis Cardoso (luis.cardoso@feedzai.com)
 * @author Henrique Dias (henrique.dias@feedzai.com)
 */

/**
 * Responsible to calculate current metrics for the repo the tool in being run on
 */
function run() {
    return getRepoName(`.`).then(repoName => {
        const repo = {
            label: repoName,
            targetBranch: "master",
            isLocal: true
        }

        return installRepo(repo).then(() => {
            const hash = getLastCommitHash(getRepoFolder(repo));
            repo.installedGitHash = hash;
            return getMetricsForRepo(repo, process.cwd()).then(results => {
                report([results], repo);
            });
        });
    })

}

/**
 * Responsible to generate commit jumps based on the factor from the CLI
 * @param  {number} numberHashes
 */
function* jumpGenerator(numberHashes) {
    const factor = configs.getCommitFactor();

    if (factor === 0) {
        yield 1;
    }

    for (let i = 0; i < numberHashes;) {
        if (i >= numberHashes) {
            yield numberHashes - 1;
        }
        if (i < (100 / factor)) {
            i++;
        } else if (i < (1000 / factor)) {
            if (numberHashes < i + 20) {
                i += 20;
            } else {
                i = numberHashes - 2;
            }
        } else if (i < (10000 / factor)) {
            if (numberHashes < i + 200) {
                i += 200;
            } else {
                i = numberHashes - 2;
            }
        }
        yield i;
    }
}

/**
 * Calculates the history for the project based on the commit history
 */
function getHistory() {
    //copy repo into tmp folder
    // 16 concurrent system calls
    ncp.limit = 16;

    const source = process.cwd();
    const local = `/tmp/repo-analyzer`;
    rimraf.sync(local);
    let repo;
    getRepoName(`${path.dirname(__dirname)}`).then(repoName => {
        ncp(source, local, {
            filter: function (name) {
                if (name.includes("node_modules")) {
                    return false;
                }
                return true;
            }
        }, function (err) {
            if (err) {
                return logger.error(err);
            }

            repo = {
                label: repoName
            }

            let funcs = [];
            let lastCheckSum;

            getAllCommits(local).then((commitHashes) => {
                for (let i of jumpGenerator(commitHashes.length)) {
                    if (i < commitHashes.length) {
                        const commitHash = commitHashes[i];
                        funcs.push(function (callback) {
                            logger.info(`Commit ${i} ou of ${commitHashes.length}`);
                            checkoutToCommit(local, commitHash);
                            if (lastCheckSum !== getPackageChecksum(local)) {
                                // works synchronously in order to ensure that the
                                // pc would not crash due to too many npm installs at the same time
                                installRepoSync(repo, local);
                                lastCheckSum = getPackageChecksum(local);
                            }
                            getMetricsForRepo(repo, local).then((res) => {
                                if (_.isObject(res)) {
                                    res.hash = commitHash;
                                }
                                callback(null, res);
                            });
                        });
                    }
                }
                async.series(funcs, function (err, results) {
                    report(results, repo);
                });
            });
        });
    })

}

configs.loadStandaloneConfig();

if (configs.isHistoryActivated()) {
    getHistory();
} else if (_.isBoolean(argv.elastic) && argv.elastic === true) {
    elastic.loadMetrics();
    elastic.createIndexes();

} else {
    run();
}


