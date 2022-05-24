import LitJsSdk from 'lit-js-sdk';

const checkAndCleanNested = (entry) => {
  if (entry.length === 1) {
    return entry[0];
  } else {
    return entry;
  }
}

const cleanAccessControlConditions = (acc) => {
  const cleanedAcc = [];
  for (let i = 0; i < acc.length; i++) {
    if (!acc[i]['operator'] && !!acc[i][0]) {
      cleanedAcc.push(checkAndCleanNested(acc[i]))
    } else if (!acc[i]['operator']) {
      cleanedAcc.push(acc[i]);
    } else {
      cleanedAcc.push(acc[i]);
    }
  }
  return cleanedAcc;
}

const humanizeAccessControlConditions = async (accessControlConditions) => {
  return await LitJsSdk.humanizeAccessControlConditions({
    accessControlConditions,
  });
};

const humanizeNestedConditions = async (acc) => {
  const newHumanizedAcc = [];
  for (let i = 0; i < acc.length; i++) {
    if (Array.isArray(acc[i])) {
      const humanizedNest = await humanizeNestedConditions(acc[i]);
      newHumanizedAcc.push(humanizedNest);
    } else if (!!acc[i] && !!acc[i]['operator']) {
      newHumanizedAcc.push({
        operator: acc[i]['operator'],
        index: i,
      })
    } else {
      const humanizedAcc = await humanizeAccessControlConditions(
        [acc[i]]
      );
      newHumanizedAcc.push({
        humanizedAcc: humanizedAcc,
        index: i,
      })
    }
  }
  return newHumanizedAcc;
}

const handleUpdateAccessControlConditions = (acc, index, depth, currentDepth = 0) => {
  if (currentDepth < depth) {
    let newCurrentDepth = currentDepth + 1;
    handleUpdateAccessControlConditions(acc, index, depth, newCurrentDepth);
  } else {
    return acc;
  }
}

const handleDeleteAccessControlCondition = (acc, index, depth, currentDepth = 0) => {
  if (currentDepth < depth) {
    let newCurrentDepth = currentDepth + 1;
    handleDeleteAccessControlCondition(acc, index, depth, newCurrentDepth)
  } else {
    return acc;
  }
}

export {
  cleanAccessControlConditions,
  humanizeNestedConditions,
  handleDeleteAccessControlCondition,
  handleUpdateAccessControlConditions
}
