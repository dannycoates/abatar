function ExperimentIndex() {
	this.experimentsByVariable = {}
}

ExperimentIndex.prototype.get = function (variable) {
	return this.experimentsByVariable[variable]
}

ExperimentIndex.prototype.add = function (variable, experiment) {
	if (this.experimentsByVariable[variable]) {
		throw new Error('only one experiment can be active for each variable for now')
	}
	this.experimentsByVariable[variable] = experiment
}

module.exports = ExperimentIndex
