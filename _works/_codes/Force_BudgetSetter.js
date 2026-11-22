
export default (projectInfo) => {
    if (projectInfo['ProjectType'] === 'Fixed' || projectInfo['ProjectType'] === 'Hourly') {
        projectInfo['ProposalBudget'] = projectInfo['MinBudget'];
    }
    return projectInfo;
}

