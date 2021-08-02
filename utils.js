/**
 * Enum for storing the current win state of the game
 * @readonly
 * @enum {number}
 */
const winStateEnum = {
  Playing: 0,
  Draw: 1,
  Won: 2
}

/**
 * Enum for storing unit types
 * @readonly
 * @enum {number}
 */
const unitTypeEnum = {
  Army: 0,
  Fleet: 1
}

/**
 * Enum for storing game phases
 * @readonly
 * @enum {number}
 */
const phaseEnum = {
  "Country Claiming": -1,
  "Order Writing": 0,
  "Retreating": 1,
  "Creating/Disbanding": 2,
  "Finished": 3
}

/**
 * Enum for storing seasons
 * @readonly
 * @enum {number}
 */
const seasonEnum = {
  Spring: 0,
  Fall: 1
}

/**
 * Enum for storing unit types
 * @readonly
 * @enum {number}
 */
const orderTypeEnum = {
  // To cancel an order (any phase)
  cancel: -1,

  // Order Writing Phase
  hold: 0,
  move: 1,
  "support hold": 2,
  "support move": 3,
  convoy: 4,

  // Retreating Phase
  retreat: 5,

  // Creating/Disbanding phase
  disband: 6,
  build: 7
}

/**
 * Information about a map alone
 * @typedef {Object} MapInfo
 * @property {Array.<Route>} routes
 * @property {Array.<Province>} provinces
 * @property {Array.<MapCountry>} countries
 * @property {Object.<string, PlayerConfiguration>} playerConfigurations
 * @property {{date: number, name: string, image: string, toWin: number}} info
 */

/**
 * A single player configuration
 * @typedef {Object} PlayerConfiguration
 * @property {string[]} eliminate
 * @property {string[][]} combine
 * @property {boolean} neutralEliminate Whether the eliminated countries still have neutral units on the board.
 */

/**
 * A single route connecting two provinces
 * @typedef {Object} Route
 * @property {string} p0 The first province
 * @property {string} p1 The second province
 * @property {string} c0 The first coast
 * @property {string} c1 The second coast
 * @property {boolean} water Whether this is a route for fleets
 */

/**
 * A single province
 * @typedef {Object} Province
 * @property {string} name
 * @property {string} id
 * @property {number} x 0 for the left side of the map, 1 for the right side
 * @property {number} y 0 for the bottom of the map, 1 for the top
 * @property {number} startUnit 0 for no unit, 1 for an army, 2 for a fleet
 * @property {boolean} supplyCenter Whether there is a supply center in this province
 * @property {boolean} water
 * @property {Array.<Coast>} coasts
 * @property {string} transparency Relative path to transparency image file
 */

/**
 * A single coast within a province
 * @typedef {Object} Coast
 * @property {string} name
 * @property {string} id
 * @property {number} x 0 for the left side of the map, 1 for the right side
 * @property {number} y 0 for the bottom of the map, 1 for the top
 * @property {boolean} frigateStart Whether this is the starting position for a fleet
 */

/**
 * A single country described by the map
 * @typedef {Object} MapCountry
 * @property {string} name
 * @property {string} id The ISO alpha-3 name for this country
 * @property {string} color The hex representation of this country's color
 * @property {Array.<string>} supplyCenters This country's starting supply centers
 */

/**
 * The state of a game at a given turn
 * @typedef {Object} State
 * @property {number} date
 * @property {seasonEnum} season
 * @property {Object.<string, Country>} nations
 * @property {phaseEnum} phase
 * @property {Object.<string, Adjustment>} adjustments Disband/build orders for the creating/disbanding phase
 * @property {Object.<string, Object.<string, Order>>} orders Keys are nation id's. Values are objects mapping provinces to selected orders
 * @property {Object.<string, Retreat>} retreats Retreat orders for the retreat phase
 */

/**
 * A single country with state information
 * @typedef {Object} Country
 * @property {string} id
 * @property {boolean} neutral
 * @property {Array.<string>} supplyCenters
 * @property {Array.<Unit>} units
 */

/**
 * A single unit
 * @typedef {Object} Unit
 * @property {string} province
 * @property {string} coast
 * @property {unitTypeEnum} type
 */

/**
 * A class representing an order for a single unit.
 * This is an abstract class, use {@link HoldOrder}, {@link MoveOrder}, {@link ConvoyOrder}, {@link SupportHoldOrder}, or {@link SupportMoveOrder} for specific orders.
 */
class Order {
  /**
   * @param {orderTypeEnum} type 
   * @param {string} province 
   * @param {string} id 
   */
  constructor (type, province, id) {
    /**
     * The type of order, as specified by {@link orderTypeEnum}.
     * @type {orderTypeEnum}
     */
    this.type = type;

    /**
     * The province ID of the unit being ordered (the starting unit for move orders).
     * @type {string}
     */
    this.province = province;

    /**
     * A unique string representing this order.
     * @type {string}
     */
    this.id = id;
  }

  /**
   * Return whether this order is equal to another by comparing their order ID's.
   * @param {Order} other 
   */
  equals(other) {
    return this.id == other.id;
  }

  /**
   * Get a simplified version of this order that can be sent between the client, server, and SQL server.
   * @returns {{type:number,unit:string}}
   */
  export() {
    return {
      type: this.type,
      unit: this.province
    };
  }
}

/**
 * Class representing an order to hold.
 */
class HoldOrder extends Order {
  /**
   * @param {string} province Province ID of holding unit.
   */
  constructor(province) {
    super(orderTypeEnum.hold, province, `hold-${province}`);
  }
}

/**
 * Class representing an order to move.
 */
class MoveOrder extends Order {
  /**
   * @param {string} province Province ID of moving unit.
   * @param {string} dest Destination province ID.
   * @param {string} coast Destination coast ID or "" if unused. Default: "".
   * @param {boolean} [isConvoy] Whether this move order is an army attempting to cross water. Default: false.
   */
  constructor(province, dest, coast="", isConvoy=false) {
    super(orderTypeEnum.move, province, `move-${province}-${dest}-${coast}${isConvoy ? "-convoy" : ""}`);

    /**
     * The ID of the destination province.
     * @type {string}
     */
    this.dest = dest;

    /**
     * The ID of the destination coast or "" for N/A.
     * @type {string}
     */
    this.coast = coast;

    /**
     * Whether or not this move order is by an army travelling over water via a convoy.
     * @type {boolean}
     */
    this.isConvoy = isConvoy;
  }

  export() {
    return {
      ...super.export(),
      province: this.dest,
      coast: this.coast,
      isconvoy: this.isConvoy
    };
  }
}

/**
 * Class representing an order to a fleet to convoy an army.
 */
class ConvoyOrder extends Order {
  /**
   * @param {string} province Province ID of supporting unit.
   * @param {string} start ID of army starting province.
   * @param {string} end ID of army destination province.
   */
  constructor(province, start, end) {
    super(orderTypeEnum.convoy, province, `convoy-${province}-${start}-${end}`);

    /**
     * The ID of the convoyed army's starting province.
     * @type {string}
     */
    this.start = start;

    /**
     * The ID of the convoyed army's destination province.
     */
    this.end = end;
  }

  export() {
    return {
      ...super.export,
      start: this.start,
      end: this.end
    };
  }
}

/**
 * Class representing an order to support a holding unit.
 */
class SupportHoldOrder extends Order {
  /**
   * @param {string} province Province ID of supporting unit.
   * @param {string} supporting Province ID of holding unit.
   */
  constructor(province, supporting) {
    super(orderTypeEnum["support hold"], province, `support-${province}-${supporting}`);

    /**
     * The ID of the province receiving support (presumably a holding unit).
     * @type {string}
     */
    this.supporting = supporting;
  }

  export() {
    return {
      ...super.export,
      supporting: this.supporting
    };
  }
}

/**
 * Class representing an order to support a moving unit.
 */
class SupportMoveOrder extends Order {
  /**
   * @param {string} province Province ID of supporting unit.
   * @param {string} supporting ID of the province being supported.
   * @param {string} from ID of the starting province of the moving unit.
   */
  constructor(province, supporting, from) {
    super(orderTypeEnum["support move"], province, `support-${province}-${from}-${to}`);

    /**
     * The ID of the province being supported and the destination province for the moving (supported) unit.
     * @type {string}
     */
    this.supporting = supporting;

    /**
     * The ID of the moving (supported) unit's starting province.
     * @type {string}
     */
    this.from = from;
  }

  export() {
    return {
      ...super.export(),
      supporting: this.supporting,
      from: this.from
    };
  }
}

/**
 * Create an {@link Order} object from a simplified order object sent from the client, server, or SQL server.
 * @param {{type:number,unit:string,province?:string,coast?:string,isconvoy?:boolean,start?:string,end?:string,supporting?:string,from?:string}} imported 
 * @returns {Order}
 */
function import_order(imported) {
  let keys = Object.keys(imported);
  /** @param {string[]} required */
  let requireKeys = required => {
    for (let key of required) {
      if (!keys.includes(key)) {
        throw Error(`Order of type ${imported.type} must include property ${key}.`);
      }
    }
  };

  switch (imported.type) {
    case orderTypeEnum.hold:
      requireKeys(["unit"]);
      return new HoldOrder(imported.unit);
    case orderTypeEnum.move:
      requireKeys(["unit", "province"]);
      return new MoveOrder(imported.unit, imported.province, keys.includes("coast") ? imported.coast : "", keys.includes("isconvoy") && imported.isconvoy);
    case orderTypeEnum.convoy:
      requireKeys(["unit", "start", "end"]);
      return new ConvoyOrder(imported.unit, imported.start, imported.end);
    case orderTypeEnum["support hold"]:
      requireKeys(["unit", "supporting"]);
      return new SupportHoldOrder(imported.unit, imported.supporting);
    case orderTypeEnum["support move"]:
      requireKeys(["unit", "supporting", "from"]);
      return new SupportMoveOrder(imported.unit, imported.supporting, imported.from);
    default:
      throw Error(`${imported.type} is not a valid order type.`);
  }
}

/**
 * Information about a game
 */
class GameData {
  constructor(json) {
    /** @type {MapInfo} */
    this.mapInfo;
    /** @type {winStateEnum} */
    this.won;
    /** @type {string} */
    this.winner;
    /** @type {number} */
    this.id;
    /** @type {string} */
    this.name;
    /** @type {string} */
    this.map;
    /**
     * Object with country names as keys and usernames as values
     * @type {Object.<string,string>}
     * */
    this.players;
    /** @type {Array.<State>} */
    this.history;
    /** @type {Array.<string>} */
    this.users;

    Object.assign(this, json);

    /** @type {Object.<string,Array.<Order>>} */
    this.orderCache = {};
  }

  /**
   * The current state of the game
   * @type {State}
   */
  get state() {
    return this.history[this.history.length - 1];
  }

  /**
   * The player configuration being used
   * @type {PlayerConfiguration}
   */
  get playerConfig() {
    return this.mapInfo.playerConfigurations[this.users.length.toString()];
  }

  /**
   * A list of country groups as an array of arrays of ID's.
   * Value gets cached.
   * @type {string[][]}
   */
  get playableCountryGroups() {  
    let ungrouped = this.mapInfo.countries.map(c => c.id).filter(id => !this.playerConfig.eliminate.includes(id));

    let groups = this.playerConfig.combine;
    groups.forEach(rule => { ungrouped = ungrouped.filter(c => !rule.includes(c)); });
    groups = groups.concat(ungrouped.map(c => c));
  
    Object.defineProperty(this, "playableCountryGroups", { value: groups.concat(ungrouped.map(c => [c])) });
    return this.playableCountryGroups;
  }

  /**
   * Return whether `order` is a selected order for any player
   * @param {Order} order
   * @returns {boolean}
   */
  is_order_selected(order) {
    for (let nation in this.state.orders) {
      for (let province in this.state.orders[nation]) {
        if (this.state.orders[nation][province].id == order.id) {
          return true;
        }
      }
    }
    return false;
  }

  supply_center_owner(provinceId) {
    for (let [id, country] of Object.entries(this.state.nations)) {
      if (country.supplyCenters.includes(provinceId)) {
        return country;
      }
    }

    return null;
  }

  get_coords(provinceId, coastId="") {
    for (let province of this.mapInfo.provinces) {
      if (province.id == provinceId) {
        if (coastId === "") {
          return {  
            x: province.x,
            y: province.y
          };
        } else {
          for (let coast of province.coasts) {
            if (coast.id == coastId) {
              return {
                x: coast.x,
                y: coast.y
              };
            }
          }
        }
      }
    }
  }

  get_unit_coords(unit) {
    return this.get_coords(unit.province, unit.coast);
  }

  get_country(countryID) {
    for (let country of this.mapInfo.countries) {
      if (country.id == countryID) {
        return country;
      }
    }
  }

  unclaimed_users() {
    return this.users.filter(user => !Object.values(this.players).includes(user));
  }

  /** Return True if the country group given in `countryList` has yet to be chosen. */
  country_group_unclaimed(countryList) {
    return this.country_group_owner(countryList) === "";
  }

  unclaimed_country_groups() {
    return this.playableCountryGroups.filter(group => this.country_group_unclaimed(group));
  }

  /** @param {string} country */
  country_owner(country) {
    return this.players[country];
  }

  country_group_owner(countryList) {
    return this.players[countryList[0]];
  }

  country_color(country) {
    return this.country_group_color(this.country_group(country));
  }

  /**
   * Return the color of the first country in a country group
   * @param {string[]} countryList
   * @returns {string} Hex color
   */
  country_group_color(countryList) {
    return this.get_country(countryList[0]).color;
  }

  /**
   * Get the country group containing a country as an array of country ID's.
   * @param {string} countryId 
   * @returns {string[]}
   */
  country_group(countryId) {
    return this.playableCountryGroups.find(group => group.includes(countryId));
  }

  country_names(countryList) {
    return countryList.map(country => this.get_country(country).name);
  }

  /**
   * Get the submitted orders for a given player.
   * 
   * @param {string} user
   */
  get_submitted_orders(username) {
    let ret = [];
    for (let nation in this.state.orders) {
      if (this.players[nation] == username) {
        for (let province in this.state.orders[nation]) {
          ret.push(this.state.orders[nation][province]);
        }
      }
    }
    return ret;
  }

  /**
   * Get the submitted order for the unit at a given province.
   * @param {string} province 
   */
  get_submitted_order_for_unit(province) {
    for (let nation in this.state.orders) {
      if (this.state.orders[nation][province]) {
        return this.state.orders[nation][province];
      }
    }
    return null;
  }

  /**
   * Get all valid orders for `unit`
   * 
   * @param {Unit} unit A unit object
   * 
   * @returns {Array.<Order>} Valid orders for `unit`
   */
  get_valid_orders(unit) {
    if (!this.orderCache[unit.province])  {
      this.orderCache[unit.province] = [];
      this.orderCache[unit.province].push(new HoldOrder(unit, this));
      this.orderCache[unit.province].push(...this.get_adjacencies(unit.province, unit.coast).map(otherSide => new MoveOrder(unit, otherSide, this), this));
      if (unit.type == unitTypeEnum.Army) {
        let convoys = this.convoy_pathfind(this.get_province(unit.province));
        this.orderCache[unit.province].push(...convoys.map(p => new MoveOrder(unit, {province: p, coast: ""}, this, this.fleets_required(unit.province, p).length > 0)));
      } else if (!unit.coast) {
        let allReachable = this.convoy_pathfind(this.get_province(unit.province));
        for (let start of allReachable) {
          let armyUnit = this.get_unit(start);
          if (armyUnit && armyUnit.type == unitTypeEnum.Army) {
            let ends = allReachable.slice();
            ends.splice(ends.indexOf(start), 1);
            this.orderCache[unit.province].push(...ends.map(end => new ConvoyOrder(unit, start, end, this)));
          }
        }
      }
      for (let adj of this.get_adjacencies(unit.province, unit.coast)) {
        let adjUnit = this.get_unit(adj.province);
        if (adjUnit) {
          this.orderCache[unit.province].push(new SupportHoldOrder(unit, adjUnit, this));
        }
        let movableTo = this.get_units_movable_to(adj.province, unit.province);
        for (let other of movableTo) {
          this.orderCache[unit.province].push(new SupportMoveOrder(unit, other, adj.province, this));
        }
      }
      this.orderCache[unit.province].sort((a, b) => { return (a.text < b.text) ? -1 : (b.text < a.text) ? 1 : 0 });
    }
    return this.orderCache[unit.province];
  }

  /**
   * Get all units that are able to move to `province` via a valid move order (convoy or otherwise)
   * @param {string} province 
   * @param {string} [exclude]
   * 
   * @returns {Array.<Unit>}
   */
  get_units_movable_to(province, exclude="") {
    let ret = [];
    for (let c in this.state.nations) {
      for (let unit of this.state.nations[c].units) {
        if (unit.province != province && unit.province != exclude) {
          for (let order of this.get_valid_orders(unit)) {
            if (order.type == "move" && order.province == province) {
              ret.push(unit);
              break;
            }
          }
        }
      }
    }
    return ret;
  }

  /**
   * Find and return all land provinces that can be reached via a convoy starting at `start_province` without traversing provinces in `ignore`.
   * 
   * @param {Province} start_province 
   * @param {Array.<string>} ignore
   * 
   * @returns {Array.<string>} ID's of reachable land provinces
   */
  convoy_pathfind(start_province, ignore=[]) {
    let ret = [];
    ignore.push(start_province.id);
    for (let adj of this.get_adjacencies_ignore_coasts(start_province.id)) {
      let adjprov = this.get_province(adj);
      if (!ignore.includes(adj) && (adjprov.water || start_province.water)) {
        if (!adjprov.water) {
          ret.push(adj);
          ignore.push(adj);
        } else if (this.get_unit(adj)) {
          let recursed = this.convoy_pathfind(this.get_province(adj), ignore);
          ret.push(...recursed);
          ignore.push(...recursed);
        }
      }
    }
    return ret;
  }

  /**
   * Return the location of fleets required to convoy an army from `start` to `end`
   * @param {string} start 
   * @param {string} end 
   * 
   * @returns {Array.<string>}
   */
  fleets_required(start, end) {
    let fleets = [];
    let step = (p) => {
      for (let adj of this.get_adjacencies_ignore_coasts(p)) {
        if (this.get_province(adj).water && this.get_unit(adj)) {
          fleets.push(adj);
          if (step(adj)) return true;
        } else if (adj == end && this.get_province(p).water) {
          return true;
        }
      }
      return false;
    };
    step(start);
    return fleets;
  }

  /**
   * Find and return the opposite ends of all routes starting at `province`
   * 
   * @param {string} province The starting province
   * 
   * @returns {Array.<string>} List of provinces accessible from `province`
   */
  get_adjacencies_ignore_coasts(province) {
    let ret = [];
    for (let route of this.mapInfo.routes) {
      let otherSide = this.route_other_end_ignore_coasts(route, province);
      if (otherSide) {
        ret.push(otherSide.province);
      }
    }

    return ret;
  }

  /**
   * Return true if there is a route connecting `p0` and `p1` ignoring coasts
   * @param {string} p0 
   * @param {string} p1 
   */
  is_adjacent_ignore_coasts(p0, p1) {
    for (let route of this.mapInfo.routes) {
      let otherSide = this.route_other_end_ignore_coasts(route, p0);
      if (otherSide && otherSide.province == p1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Return true if there is a route connecting `p0` and `p1`
   * @param {PlaceIdentifier} p0 
   * @param {PlaceIdentifier} p1 
   */
  is_adjacent(p0, p1) {
    for (let route of this.mapInfo.routes) {
      let otherSide = this.route_other_end(route, p0.province, p0.coast);
      if (otherSide && otherSide.province == p1.province && otherSide.coast == p1.coast) {
        return true;
      }
    }
    return false;
  }

  /**
   * Return `null` if the route does not connect to the given province. Otherwise, returns an object with keys `province` and `coast` representing the other side of the route.
   * 
   * @param {Route} route A Route object
   * @param {string} province A province ID
   * 
   * @returns {PlaceIdentifier}
   */
  route_other_end_ignore_coasts(route, province) {
    if (route.p0 === province) {
      return {
        province: route.p1,
        coast: route.c1
      }
    } else if (route.p1 === province) {
      return {
        province: route.p0,
        coast: route.c0
      }
    }
    return null;
  }

  /**
   * Find and return the opposite ends of all routes starting at `province` and `coast`
   * 
   * @param {string} province The starting province
   * @param {string} coast The starting coast, if applicable
   * 
   * @returns {Array.<PlaceIdentifier>} List of provinces and coasts accessible from `province` and `coast`
   */
  get_adjacencies(province, coast="") {
    let ret = [];
    for (let route of this.mapInfo.routes) {
      let otherSide = this.route_other_end(route, province, coast);
      if (otherSide) {
        ret.push(otherSide);
      }
    }

    return ret;
  }

  /**
   * Return `null` if the route does not connect to the given province and coast. Otherwise, returns an object with keys `province` and `coast` representing the other side of the route.
   * 
   * @param {Route} route A Route object
   * @param {string} province A province ID
   * @param {string} coast A coast ID
   * 
   * @returns {PlaceIdentifier}
   */
  route_other_end(route, province, coast) {
    if (route.p0 === province && route.c0 === coast) {
      return {
        province: route.p1,
        coast: route.c1
      }
    } else if (route.p1 === province && route.c1 === coast) {
      return {
        province: route.p0,
        coast: route.c0
      }
    }
    return null;
  }

  get_province(id) {
    for (let province of this.mapInfo.provinces) {
      if (province.id === id) {
        return province;
      }
    }

    return null;
  }

  get_coast(provinceId, coastId) {
    let province = this.get_province(provinceId);

    for (let coast of province.coasts) {
      if (coast.id == coastId) {
        return coast;
      }
    }

    return null;
  }

  /**
   * Get the object representing the country that owns the unit at `province`
   * 
   * @param {string} province 
   */
  get_unit_owner(province) {
    return this.get_country(this.get_unit_owner_id(province));
  }

  get_unit_owner_id(province) {
    for (let [country, countryData] of Object.entries(this.state.nations)) {
      for (let unit of countryData.units) {
        if (unit.province === province) {
          return country;
        }
      }
    }

    return null;
  }

  /**
   * Get the id of the player who owns the unit at `province`
   * @param {string} province 
   */
  get_unit_owner_player(province) {
    return this.country_owner(this.get_unit_owner_id(province));
  }

  /**
   * Get the object representing the unit at `province`
   * 
   * @param {string} province The location of the unit
   * 
   * @returns {Unit} The unit
   */
  get_unit(province) {
    for (let countryData of Object.values(this.state.nations)) {
      for (let unit of countryData.units) {
        if (unit.province === province) {
          return unit;
        }
      }
    }

    return null;
  }

  /**
   * Get the path to the file with path `relpath` relative to the .dipmap file for this map
   * @param {string} relpath 
   */
  path_from_relative(relpath) {
    return "maps/" + get_dir(this.map) + relpath;
  }

}

if (typeof(exports) !== "undefined") {
  exports.GameData = GameData;
  exports.winStateEnum = winStateEnum;
  exports.phaseEnum = phaseEnum;
  exports.seasonEnum = seasonEnum;
  exports.unitTypeEnum = unitTypeEnum;
  exports.orderTypeEnum = orderTypeEnum;
  exports.import_order = import_order;
  exports.Order = Order;
  exports.HoldOrder = HoldOrder;
  exports.MoveOrder = MoveOrder;
  exports.ConvoyOrder = ConvoyOrder;
  exports.SupportHoldOrder = SupportHoldOrder;
  exports.SupportMoveOrder = SupportMoveOrder;
}