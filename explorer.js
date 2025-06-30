
console.log("STARTED...");

let logElement;
let playerUsername;
let initialPlacementMade = false;
const receivedResourcesSnippet = "got";

const wood = "wood";
const stone = "stone";
const wheat = "wheat";
const brick = "brick";
const sheep = "sheep";
const resourceTypes = [wood, brick, sheep, wheat, stone];

// Players
const players = [];
const player_colors = {}; // player -> hex

// Per player per resource
let resources = {};

// Message offset
let MSG_OFFSET = 0;

const zeros = [0, 0, 0, 0, 0];
const zero_deltas = [zeros, zeros, zeros, zeros];
// Unknow theft potential deltas

function deep_copy_2d_array(array) {
  return array.map(sub_array => Array.from(sub_array));
}
let potential_state_deltas = [];


function LogFailedToParse(...players) {
  console.log("Failed to parse player...", ...players, resources);
}

// First, delete the discord signs
function deleteDiscordSigns() {
  const allPageImages = document.getElementsByTagName("img");
  for(let i = 0; i < allPageImages.length; i++) {
    if (allPageImages[i].src.includes("discord")) {
      allPageImages[i].remove();
    }
  }
  const ad_left = document.getElementById("in-game-ad-left");
  if (ad_left) {
    ad_left.remove();
  }
  const ad_right = document.getElementById("in-game-ad-right");
  if (ad_right) {
    ad_right.remove();
  }
}

/**
 * Calculate the total lost quantity of a resource for a given player.
 * i.e. if 1 card was potentially stolen, return 1.
 */
function calculateTheftForPlayerAndResource(player, resourceType) {
  const result = new Set();
  const playerIndex = players.indexOf(player);
  const resourceIndex = resourceTypes.indexOf(resourceType);
  for (const potential_state_delta of potential_state_deltas) {
    const diff = potential_state_delta[playerIndex][resourceIndex];
    if (diff !== 0) {
      result.add(diff);
    }
  }
  return Array.from(result);
}

function calculateTheftForPlayer(player) {
  if (potential_state_deltas.length === 0) {
    return [[0], [0]];
  }
  const playerIndex = players.indexOf(player);

  const theftsBy = potential_state_deltas.map(potential_state_delta =>
    potential_state_delta[playerIndex].filter(x => x > 0).reduce((a, b) => a + b, 0));
  const theftsFrom = potential_state_deltas.map(potential_state_delta =>
    potential_state_delta[playerIndex].filter(x => x < 0).reduce((a, b) => a + b, 0));
  return [Array.from(new Set(theftsBy)), Array.from(new Set(theftsFrom))];
}

function getResourceImg(resourceType) {
  let img_name = "";
  switch (resourceType) {
  case wheat:
    img_name = "card_grain";
    break;
  case stone:
    img_name = "card_ore";
    break;
  case sheep:
    img_name = "card_wool";
    break;
  case brick:
    img_name = "card_brick";
    break;
  case wood:
    img_name = "card_lumber";
    break;
  }
  if (!img_name.length) {throw Error("Couldn't find resource image icon");}
  return `<img src="https://colonist.io/dist/images/${img_name}.svg" class="explorer-tbl-resource-icon" />`;
}

function renderPlayerCell(player) {
  return `
        <div class="explorer-tbl-player-col-cell-color" style="background-color:${player_colors[player]}"></div>
        <span class="explorer-tbl-player-name" style="color:${player_colors[player]}">${player}</span>
    `;
}

let render_cache = null;
function shouldRenderTable(...deps) {
  if (JSON.stringify(deps) === render_cache) {
    return false;
  }
  render_cache = JSON.stringify(deps);
  console.log("Will render...");
  return true;
}

/*
function getTotalDeltas() {
    if (potential_state_deltas.length === 0)
        return deep_copy_2d_array(zero_deltas);

    var result = potential_state_deltas.reduce(add_array_of_arrays);
    return result;
}
*/

/**
* Renders the table with the counts.
*/
function render() {
  if (!shouldRenderTable(resources, potential_state_deltas)) {
    return;
  }

  const existingTbl = document.getElementById("explorer-tbl");
  try {
    if (existingTbl) {
      existingTbl.remove();
    }
  } catch (e) {
    console.warning("had an issue deleting the table", e);
  }
  const body = document.getElementsByTagName("body")[0];
  const tbl = document.createElement("table");
  tbl.setAttribute("cellspacing", 0);
  tbl.setAttribute("cellpadding", 0);
  tbl.id = "explorer-tbl";

  // Header row - one column per resource, plus player column
  const header = tbl.createTHead();
  header.className = "explorer-tbl-header";
  const headerRow = header.insertRow(0);
  const playerHeaderCell = headerRow.insertCell(0);
  playerHeaderCell.innerHTML = "Name";
  playerHeaderCell.className = "explorer-tbl-player-col-header";
  for (let  i = 0; i < resourceTypes.length; i++) {
    const resourceType = resourceTypes[i];
    const resourceHeaderCell = headerRow.insertCell(i + 1);
    resourceHeaderCell.className = "explorer-tbl-cell";
    resourceHeaderCell.innerHTML = getResourceImg(resourceType);
  }
  const theftsByHeaderCell = headerRow.insertCell(resourceTypes.length + 1);
  theftsByHeaderCell.innerHTML = "+";
  theftsByHeaderCell.className = "explorer-tbl-cell";
  const theftsFromHeaderCell = headerRow.insertCell(resourceTypes.length + 2);
  theftsFromHeaderCell.innerHTML = "-";
  theftsFromHeaderCell.className = "explorer-tbl-cell";
  const totalHeaderCell = headerRow.insertCell(resourceTypes.length + 3);
  totalHeaderCell.innerHTML = "Total";
  totalHeaderCell.className = "explorer-tbl-cell";

  const tblBody = tbl.createTBody();

  // Row per player
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const row = tblBody.insertRow(i);
    row.className = "explorer-tbl-row";
    const playerRowCell = row.insertCell(0);
    playerRowCell.className = "explorer-tbl-player-col-cell";
    playerRowCell.innerHTML = renderPlayerCell(player);
    for (let j = 0; j < resourceTypes.length; j++) {
      const cell = row.insertCell(j + 1);
      cell.className = "explorer-tbl-cell";
      const resourceType = resourceTypes[j];
      const cellCount = resources[player][resourceType];
      const theftSet = calculateTheftForPlayerAndResource(player, resourceType);
      cell.innerHTML = theftSet.length === 0 
        ? "" + cellCount
        : `${cellCount} (${theftSet})`;
    }
    const [theftBy, theftFrom]  = calculateTheftForPlayer(player);
    const theftByCell = row.insertCell(resourceTypes.length + 1);
    theftByCell.className = "explorer-tbl-cell";
    theftByCell.innerHTML = theftBy.length === 1
      ? "" + theftBy
      : `(${theftBy})`;

    const theftFromCell = row.insertCell(resourceTypes.length + 2);
    theftFromCell.className = "explorer-tbl-cell";
    theftFromCell.innerHTML = theftFrom.length === 1
      ? "" + theftFrom
      : `(${theftFrom})`;

    const totalCell = row.insertCell(resourceTypes.length + 3);
    totalCell.className = "explorer-tbl-cell";
    let totalResources = Object.values(resources[player]).reduce((acc, x) => acc + x, 0);
    if (theftBy.length !== 0) {
      totalResources += theftBy[0];
    }
    if (theftFrom.length !== 0) {
      totalResources += theftFrom[0];
    }
    totalCell.innerHTML = "" + totalResources;
  }

  // put <table> in the <body>
  body.appendChild(tbl);
  // tbl border attribute to
  tbl.setAttribute("border", "2");
}

/**
* Process a "got resource" message: [user icon] [user] got: ...[resource images]
*/
function parseGotMessageHelper(pElement, snippet) {
  const textContent = pElement.textContent;
  if (!textContent.includes(snippet)) {
    return;
  }
  const player = textContent.replace(snippet, "").split(" ")[0];
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  for (const img of images) {
    if (img.src.includes("card_wool")) {
      resources[player][sheep] += 1;
    } else if (img.src.includes("card_lumber")) {
      resources[player][wood] += 1;
    } else if (img.src.includes("card_brick")) {
      resources[player][brick] += 1;
    } else if (img.src.includes("card_ore")) {
      resources[player][stone] += 1;
    } else if (img.src.includes("card_grain")) {
      resources[player][wheat] += 1;
    }
  }
}


function parseGotMessage(pElement) {
  if (pElement.textContent.includes("gave")) {
    // This is a trade message, not a got message.
    return;
  }
  parseGotMessageHelper(pElement, receivedResourcesSnippet);
}

/**
 * Process a "built" message: [user icon] [user] built a [building/road]
 */
function parseBuiltMessage(pElement) {
  const builtSnippet = "built a";

  const textContent = pElement.textContent;
  if (!textContent.includes(builtSnippet)) {
    return;
  }
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  const player = textContent.split(" ")[0];
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  for (const img of images) {
    if (img.src.includes("road")) {
      resources[player][wood] -= 1;
      resources[player][brick] -= 1;
    } else if (img.src.includes("settlement")) {
      resources[player][wood] -= 1;
      resources[player][brick] -= 1;
      resources[player][sheep] -= 1;
      resources[player][wheat] -= 1;
    } else if (img.src.includes("city")) {
      resources[player][stone] -= 3;
      resources[player][wheat] -= 2;
    }
  }
}

/**
 * Process a "bought" message: [user icon] [user] built
 */
function parseBoughtMessage(pElement) {
  const boughtSnippet = "bought";
  const textContent = pElement.textContent;
  if (!textContent.includes(boughtSnippet)) {
    return;
  }
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  const player = textContent.split(" ")[0];
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  for (const img of images) {
    if (img.src.includes("card_devcardback")) {
      resources[player][sheep] -= 1;
      resources[player][wheat] -= 1;
      resources[player][stone] -= 1;
    }
  }
}



/**
 * "[user] took from bank: [resource]
 */
function parseYearOfPleantyMessage(pElement) {
  const yearOfPleantlySnippet = "took from bank";

  const textContent = pElement.textContent;
  if (!textContent.includes(yearOfPleantlySnippet)) {
    return;
  }
  const player = textContent.split(" ")[0];
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  for (const img of images) {
    if (img.src.includes("card_wool")) {
      resources[player][sheep] += 1;
    } else if (img.src.includes("card_lumber")) {
      resources[player][wood] += 1;
    } else if (img.src.includes("card_brick")) {
      resources[player][brick] += 1;
    } else if (img.src.includes("card_ore")) {
      resources[player][stone] += 1;
    } else if (img.src.includes("card_grain")) {
      resources[player][wheat] += 1;
    }
  }
}

/**
 * Process a trade with the bank message: [user icon] [user] gave bank: ...[resources] and took ...[resources]
 */
function parseTradeBankMessage(pElement) {
  const tradeBankGaveSnippet = "gave bank";
  const tradeBankTookSnippet = "and took";

  const textContent = pElement.textContent;
  if (!textContent.includes(tradeBankGaveSnippet)) {
    return;
  }
  const player = textContent.split(" ")[0];
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  // We have to split on the text, which isn't wrapped in tags, so we parse innerHTML, which prints the HTML and the text.
  const innerHTML = pElement.innerHTML;
  const gavebank = innerHTML.slice(innerHTML.indexOf(tradeBankGaveSnippet), innerHTML.indexOf(tradeBankTookSnippet)).split("<img");
  const andtook = innerHTML.slice(innerHTML.indexOf(tradeBankTookSnippet)).split("<img");
  for (const imgStr of gavebank) {
    if (imgStr.includes("card_wool")) {
      resources[player][sheep] -= 1;
    } else if (imgStr.includes("card_lumber")) {
      resources[player][wood] -= 1;
    } else if (imgStr.includes("card_brick")) {
      resources[player][brick] -= 1;
    } else if (imgStr.includes("card_ore")) {
      resources[player][stone] -= 1; 
    } else if (imgStr.includes("card_grain")) {
      resources[player][wheat] -= 1;
    }
  }
  for (const imgStr of andtook) {
    if (imgStr.includes("card_wool")) {
      resources[player][sheep] += 1;
    } else if (imgStr.includes("card_lumber")) {
      resources[player][wood] += 1;
    } else if (imgStr.includes("card_brick")) {
      resources[player][brick] += 1;
    } else if (imgStr.includes("card_ore")) {
      resources[player][stone] += 1; 
    } else if (imgStr.includes("card_grain")) {
      resources[player][wheat] += 1;
    }
  }
}

function stealAllOfResource(receivingPlayer, resource) {
  for (const plyr of players) {
    if (plyr !== receivingPlayer) {
      resources[receivingPlayer][resource] += resources[plyr][resource];
      resources[plyr][resource] = 0;
    }
  }
}

/*
*  [user] stole [number]: [resource]
*/
function isMonopoly(text) {
  const arr = text.replace(":", "").split(" ");
  if (arr[1] === "stole" && !isNaN(parseInt(arr[2]))) {
    return true;
  }
  return false;
}

/**
 * Parse monopoly card
 */
function parseStoleAllOfMessage(pElement) {
  const textContent = pElement.textContent;
  if (!isMonopoly(textContent)) {
    return;
  }
  const player = textContent.split(" ")[0];
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  // there will only be 1 resource icon
  for (const img of images) {
    if (img.src.includes("card_wool")) {
      stealAllOfResource(player, sheep);
    } else if (img.src.includes("card_lumber")) {
      stealAllOfResource(player, wood);
    } else if (img.src.includes("card_brick")) {
      stealAllOfResource(player, brick);
    } else if (img.src.includes("card_ore")) {
      stealAllOfResource(player, stone);
    } else if (img.src.includes("card_grain")) {
      stealAllOfResource(player, wheat);
    }
  }
}

/**
 * When the user has to discard cards because of a robber.
 */
function parseDiscardedMessage(pElement) {
  const discardedSnippet = "discarded";
  const textContent = pElement.textContent;
  if (!textContent.includes(discardedSnippet)) {
    return;
  }
  const player = textContent.replace(receivedResourcesSnippet, "").split(" ")[0];
  if (!resources[player]) {
    LogFailedToParse(player);
    return;
  }
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  for (const img of images) {
    if (img.src.includes("card_wool")) {
      resources[player][sheep] -= 1;
    } else if (img.src.includes("card_lumber")) {
      resources[player][wood] -= 1;
    } else if (img.src.includes("card_brick")) {
      resources[player][brick] -= 1;
    } else if (img.src.includes("card_ore")) {
      resources[player][stone] -= 1; 
    } else if (img.src.includes("card_grain")) {
      resources[player][wheat] -= 1;
    }
  }
}

function transferResource(srcPlayer, destPlayer, resource, quantity = 1) {
  resources[srcPlayer][resource] -= quantity;
  resources[destPlayer][resource] += quantity;
}

/**
 * Message T-1: [user1] wants to give: ...[resources] for: ...[resources]
 * Message T: [user1] traded with: [user2]
 */
function parseTradedMessage(pElement, prevElement) {
  const tradedSnippet = "gave";
  const tradeGiveForSnippet = "and got";
  const tradedWithSnippet = "from";

  const textContent = pElement.textContent;
  if (!textContent.includes(tradedWithSnippet)) {
    return;
  }
  const tradingPlayer = textContent.split(tradedSnippet)[0].trim();
  const agreeingPlayer = textContent.split(tradedWithSnippet)[1].trim();
  if (!resources[tradingPlayer] || !resources[agreeingPlayer]) {
    LogFailedToParse(tradingPlayer, agreeingPlayer, pElement.textContent, prevElement.textContent);
    return;
  }
  // We have to split on the text, which isn't wrapped in tags, so we parse innerHTML, which prints the HTML and the text.
  const innerHTML = pElement.innerHTML; // on the trade description msg
  const wantstogive = innerHTML.slice(0, innerHTML.indexOf(tradeGiveForSnippet)).split("<img");
  const givefor = innerHTML.slice(innerHTML.indexOf(tradeGiveForSnippet)).split("<img");
  for (const imgStr of wantstogive) {
    if (imgStr.includes("card_wool")) {
      transferResource(tradingPlayer, agreeingPlayer, sheep);
    } else if (imgStr.includes("card_lumber")) {
      transferResource(tradingPlayer, agreeingPlayer, wood);
    } else if (imgStr.includes("card_brick")) {
      transferResource(tradingPlayer, agreeingPlayer, brick);
    } else if (imgStr.includes("card_ore")) {
      transferResource(tradingPlayer, agreeingPlayer, stone);
    } else if (imgStr.includes("card_grain")) {
      transferResource(tradingPlayer, agreeingPlayer, wheat);
    }
  }
  for (const imgStr of givefor) {
    if (imgStr.includes("card_wool")) {
      transferResource(agreeingPlayer, tradingPlayer, sheep);
    } else if (imgStr.includes("card_lumber")) {
      transferResource(agreeingPlayer, tradingPlayer, wood);
    } else if (imgStr.includes("card_brick")) {
      transferResource(agreeingPlayer, tradingPlayer, brick);
    } else if (imgStr.includes("card_ore")) {
      transferResource(agreeingPlayer, tradingPlayer, stone);
    } else if (imgStr.includes("card_grain")) {
      transferResource(agreeingPlayer, tradingPlayer, wheat);
    }
  }
}

function isKnownSteal(textContent) {
  const stoleFromYouSnippet = "You stole";
  const youStoleSnippet = "from you";
  return textContent.includes(stoleFromYouSnippet) || textContent.includes(youStoleSnippet);
}

/**
 * Message T-1: [stealingPlayer] moved robber to [number] [resource]
 * Message T: [stealingPlayer] stole: [resource] from [targetPlayer]
 */
function parseStoleFromYouMessage(pElement, prevElement) {
  const textContent = pElement.textContent;
  if (!isKnownSteal(textContent)) {
    return;
  }
  // var involvedPlayers = prevElement.textContent.replace(stoleFromSnippet, " ").split(" ");
  const splitText = textContent.split(" ");
  let stealingPlayer = splitText[0];
  let targetPlayer = splitText.slice(-1)[0];
  if (stealingPlayer === "You") {
    stealingPlayer = playerUsername;
  }
  if (targetPlayer === "you") {
    targetPlayer = playerUsername;
  }

  if (!resources[stealingPlayer] || !resources[targetPlayer]) {
    LogFailedToParse(stealingPlayer, targetPlayer);
    return;
  }
  const images = collectionToArray(pElement.getElementsByTagName("img"));
  for (const img of images) {
    if (img.src.includes("card_wool")) {
      transferResource(targetPlayer, stealingPlayer, sheep);
    } else if (img.src.includes("card_lumber")) {
      transferResource(targetPlayer, stealingPlayer, wood);
    } else if (img.src.includes("card_brick")) {
      transferResource(targetPlayer, stealingPlayer, brick);
    } else if (img.src.includes("card_ore")) {
      transferResource(targetPlayer, stealingPlayer, stone);
    } else if (img.src.includes("card_grain")) {
      transferResource(targetPlayer, stealingPlayer, wheat);
    }
  }
}

function add_array_of_arrays(array0, array1) {

  return array0.map((row, outer_index) =>
    row.map((element, inner_index) => array1[outer_index][inner_index] + element),
  );
}

/**
 * Message T-1: [stealingPlayer] stole [resource] from: [targetPlayer]
 * Message T is NOT: [stealingPlayer] stole: [resource]
 */
function parseStoleUnknownMessage(pElement, prevElement) {
  if (!prevElement) {
    return;
  }
  const messageT = pElement.textContent;
  if (!messageT.includes("stole") || isKnownSteal(messageT) || isMonopoly(messageT)) {
    return;
  }
  // figure out the 2 players
  const involvedPlayers = messageT.split(" ");
  const stealingPlayer = involvedPlayers[0];
  const targetPlayer = involvedPlayers.slice(-1)[0];
  if (!resources[stealingPlayer] || !resources[targetPlayer]) {
    LogFailedToParse(stealingPlayer, targetPlayer);
    return;
  }
  // for the player being stolen from, (-1) on all resources that are non-zero
  // for the player receiving, (+1) for all resources that are non-zero FOR THE OTHER PLAYER
  // record the unknown and wait for it to surface

  const stealingPlayerIndex = players.indexOf(stealingPlayer);
  const targetPlayerIndex = players.indexOf(targetPlayer);
    
  const potential_deltas = [];
  for (const index of resourceTypes.keys()) {
    const temp = deep_copy_2d_array(zero_deltas);
    temp[stealingPlayerIndex][index] = 1;
    temp[targetPlayerIndex][index] = -1;
    potential_deltas.push(temp);
  }
    
  potential_state_deltas = (potential_state_deltas.length === 0
    ? [deep_copy_2d_array(zero_deltas)]
    : potential_state_deltas
  ).flatMap(potential_accumulated_delta => 
    potential_deltas.map(potential_delta =>
      add_array_of_arrays(potential_delta, potential_accumulated_delta)));
}
function getIndices(predicate, delta) {
  for (const [outer_index, player_delta] of delta.entries()) {
    const inner_index = player_delta.findIndex(predicate);
    if (inner_index >= 0) {
      return [outer_index, inner_index];
    }
  }
  throw Error("no entry satisfies getIndices predicate");
}

function areAnyNegative(arrayOfArrays) {
  for (const row of arrayOfArrays) {
    for (const element of row) {
      if (element < 0) {
        return true;
      }
    }
  }
  return false;
}

function areAllZero(arrayOfArrays) {
  for (const row of arrayOfArrays) {
    for (const element of row) {
      if (element !== 0) {
        return false;
      }
    }
  }
  return true;
}

function shouldKeep(potential_resources, delta) {
  if (areAnyNegative(potential_resources) || areAllZero(delta)) {
    return false;
  }
  return true;
}

function playerResourcesToArray(playerResourcesDict) {
  const result = [];
  for (const resource of resourceTypes) {
    result.push(playerResourcesDict[resource]);
  }
  return result;
}

function resourcesToDict(resourcesArray) {
  const result = {};
  for (const [playerIndex, playerResources] of resourcesArray.entries()) {
    const playerResourceDict = {};
    for (const [resourceIndex, resourceAmount] of playerResources.entries()) {
      playerResourceDict[resourceTypes[resourceIndex]] = resourceAmount;
    }

    result[players[playerIndex]] = playerResourceDict;
  }
  return result;
}

function resourcesToArray(resourcesDict) {
  const result = [];
  for (const player of players) {
    result.push(playerResourcesToArray(resourcesDict[player]));
  }
  return result;
}
/**
 * See if thefts can be solved based on current resource count.
 * Rules:
 *  
 *  - if resource count < 0, then they spent a resource they stole (what if there are multiple thefts that could account for this?)
 *  - if resource count + theft count < 0, then we know that resource was stolen, and we can remove it from the list of potentials.
 *     - if there's only 1 resource left, we know what was stolen in another instance.
 */
function reviewThefts() {
  const resourcesArray = resourcesToArray(resources);
  const before_len = potential_state_deltas.length;
  const potential_state_deltas_temp = potential_state_deltas.filter(delta =>
    shouldKeep(add_array_of_arrays(resourcesArray, delta), delta),
  );
    
  if (potential_state_deltas_temp.length === 0) {
    if (areAnyNegative(resourcesArray)) {
      getAllMessages().map(x => x.textContent).slice(-100);
      console.error("Couldn't resolve thefts correctly. There almost certianly is a bug parsing messages");
    }
  }
  potential_state_deltas = potential_state_deltas_temp;

  if (potential_state_deltas.length === 1) {
    const actual_resources_delta = potential_state_deltas[0];
    const actual_resources = add_array_of_arrays(actual_resources_delta, resourcesArray);
    if (areAnyNegative(actual_resources)) {
      throw Error("Couldn't resolve thefts correctly");
    }
    const resources_temp = resourcesToDict(actual_resources);
    resources = resources_temp;
    potential_state_deltas = [];
  }
}

const ALL_PARSERS = [
  parseGotMessage,
  parseBuiltMessage,
  parseBoughtMessage,
  parseTradeBankMessage,
  parseYearOfPleantyMessage,
  parseStoleAllOfMessage,
  parseDiscardedMessage,
  parseTradedMessage,
  parseStoleFromYouMessage,
  parseStoleUnknownMessage,
];

function checkValidResourceCount() {
  for(const [playerName, resourceDict] of Object.entries(resources)) {
    for (const [resource, count] of Object.entries(resourceDict)) {
      if (count < 0) {
        console.log(`${playerName} has ${count} of ${resource}`);
      }

    }
  }
}

function zip(x, y) {
  return Array.from(Array(Math.max(x.length, y.length)), (_, i) => [x[i], y[i]]);
}
/**
 * Parses the latest messages and re-renders the table.
 */
function parseLatestMessages() {
  const allMessages = getAllMessages();
  const newOffset = allMessages.length;
  const newMessages = allMessages.slice(MSG_OFFSET);
  if (newMessages.length === 0) {return;}

  const prevMessages = allMessages.slice(MSG_OFFSET - 1, -1);

  for (const [message, prevMessage] of zip(newMessages, prevMessages)) {
    ALL_PARSERS.forEach(parser => parser(message, prevMessage));
    reviewThefts();
  }
  MSG_OFFSET = newOffset;
  render();
}

function startWatchingMessages() {
  setInterval(parseLatestMessages, 500);
}

/**
* Log initial resource distributions.
*/
function tallyInitialResources() {
  const startingResourcesSnippet = "received starting resources";
  const allMessages = getAllMessages();
  MSG_OFFSET = allMessages.length;
  allMessages.forEach(pElement => parseGotMessageHelper(pElement, startingResourcesSnippet));
  allMessages.forEach(pElement => parseGotMessage(pElement));
  deleteDiscordSigns();
  render();
  deleteDiscordSigns(); // idk why but it takes 2 runs to delete both signs
  startWatchingMessages();
}

/**
* Once initial settlements are placed, determine the players.
*/
function recognizeUsers() {
  const placeInitialSettlementSnippet = "placed a";

  const allMessages = getAllMessages();
  const placementMessages = allMessages.filter(msg => msg.textContent.includes(placeInitialSettlementSnippet));
  console.log("total placement messages", placementMessages.length);
  for (const msg of placementMessages) {
    const msg_text = msg.textContent;
    const username = msg_text.replace(placeInitialSettlementSnippet, "").split(" ")[0];
    console.log(username);
    if (!resources[username]) {
      players.push(username);
      player_colors[username] = msg.style.color;
      resources[username] = {
        [wood]: 0,
        [stone]: 0,
        [wheat]: 0,
        [brick]: 0,
        [sheep]: 0,
      };
    }
  }
}

function clearResources() {
  for (const player of players) {
    resources[player] = {};
    for (const resourceType of resourceTypes) {
      resources[player][resourceType] = 0;
    }
  }
}

function loadCounter() {
  setTimeout(() => {
    recognizeUsers();
    tallyInitialResources();
  }, 500); // wait for inital resource distribution to be logged
}

function getAllMessages() {
  if (!logElement) {
    throw Error("Log element hasn't been found yet.");
  }
  return collectionToArray(logElement.children);
}

function collectionToArray(collection) {
  return Array.prototype.slice.call(collection);
}

/**
* Wait for players to place initial settlements so we can determine who the players are.
*/
function waitForInitialPlacement() {
  const interval = setInterval(() => {
    if (initialPlacementMade) {
      clearInterval(interval);
      loadCounter();
    } else {
      const messages = Array.prototype.slice.call(logElement.children).map(p => p.textContent);
      if (messages.some(m => m.includes("rolled"))) {
        initialPlacementMade = true;
      }
    }
  }, 500);
}

/**
* Find the transcription.
*/
function findTranscription() {
  const interval = setInterval(() => {
    if (logElement) {
      console.log("Logs loaded...");
      clearInterval(interval);
      waitForInitialPlacement();
    } else {
      logElement = document.getElementsByClassName("pJOx4Tg4n9S8O1RM16YT")[0];
    }
  }, 500);
}

function findPlayerName() {
  const interval = setInterval(() => {
    if (playerUsername) {
      console.log("player name loaded...");
      clearInterval(interval);
      playerUsername = playerUsername.textContent;
    } else {
      playerUsername = document.getElementById("header_profile_username");//document.getElementById("game-log-text");
    }
  }, 500);
}

findPlayerName();
findTranscription();
