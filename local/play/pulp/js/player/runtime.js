// DO NOT MODIFY MANUALLY
// (transpiled from Source/runtime.lua by PulpRuntime/make/lua2js.php)

var RUNTIME_VERSION = 1
var VoiceType = {
	Sine : 0,
	Square : 1,
	Sawtooth : 2,
	Triangle : 3,
	Noise : 4,
}
var ExitEdge = {
	North : 0,
	East : 1,
	South : 2,
	West : 3,
}


var errorSource = '<runtime>'
var errorLine = -1



//---------------------------------------------------------
// constants
var frameDuration = 0.05 // 20fps
var roomTilesWide = 25
var roomTilesHigh = 15
var tileWidth = 8
var tileHeight = 8
var textLines = 4
var TileType = {
	World : 0,
	Player : 1,
	Sprite : 2,
	Item : 3,
}
var FontType = {
	HalfWidth : 0,
	FullWidth : 1,
}
var defaultRoomFrames = []
// these aren't constants!
var drawnRoomFrames = []
var dirtyRoomFrames = []
for (var i=1; i<=roomTilesWide*roomTilesHigh; i+=1) {
	defaultRoomFrames[idx(i)] = 1
	drawnRoomFrames[idx(i)] = -1
	dirtyRoomFrames[idx(i)] = true
}
var dirtyRoom = function() {
	for (var i=1; i<=roomTilesWide*roomTilesHigh; i+=1) {
		drawnRoomFrames[idx(i)] = -1
	}
}
var ignoreDraw = 0 // increment/decrement with push/popContext calls
var setDirtyRect = function(tileX,tileY,tilesWide,tilesHigh) {
	if ( LuaTrue( ignoreDraw>0 ) ) { return }
	
	for (var y=0; y<=tilesHigh-1; y+=1) {
		for (var x=0; x<=tilesWide-1; x+=1) {
			var i = roomTilesWide * (tileY + y) + (tileX + x) + 1
			drawnRoomFrames[idx(i)] = -1
		}
	}
}
var voices = []
var defaultEnvelope = {
	attack : 0.005,
	decay : 0.1,
	sustain : 0.5,
	release : 0.1,
	volume : 1.0,
}
for (var i=1; i<=5; i+=1) {
	voices[idx(i)] = newVoice(i-1, defaultEnvelope.attack,defaultEnvelope.decay,defaultEnvelope.sustain,defaultEnvelope.release,defaultEnvelope.volume)
}
var Frequency = [
	0, // rest
	16.351598,
	17.323914,
	18.354048,
	19.445436,
	20.601722,
	21.826764,
	23.124651,
	24.499715,
	25.956544,
	27.5,
	29.135235,
	30.867706,
	32.703196,
	34.647829,
	36.708096,
	38.890873,
	41.203445,
	43.653529,
	46.249303,
	48.999429,
	51.913087,
	55,
	58.27047,
	61.735413,
	65.406391,
	69.295658,
	73.416192,
	77.781746,
	82.406889,
	87.307058,
	92.498606,
	97.998859,
	103.826174,
	110,
	116.54094,
	123.470825,
	130.812783,
	138.591315,
	146.832384,
	155.563492,
	164.813778,
	174.614116,
	184.997211,
	195.997718,
	207.652349,
	220,
	233.081881,
	246.941651,
	261.625565,
	277.182631,
	293.664768,
	311.126984,
	329.627557,
	349.228231,
	369.994423,
	391.995436,
	415.304698,
	440,
	466.163762,
	493.883301,
	523.251131,
	554.365262,
	587.329536,
	622.253967,
	659.255114,
	698.456463,
	739.988845,
	783.990872,
	830.609395,
	880,
	932.327523,
	987.766603,
	1046.502261,
	1108.730524,
	1174.659072,
	1244.507935,
	1318.510228,
	1396.912926,
	1479.977691,
	1567.981744,
	1661.21879,
	1760,
	1864.655046,
	1975.533205,
	2093.004522,
	2217.461048,
	2349.318143,
	2489.01587,
	2637.020455,
	2793.825851,
	2959.955382,
	3135.963488,
	3322.437581,
	3520,
	3729.310092,
	3951.06641,
	4186.009045,
	4434.922096,
	4698.636287,
	4978.03174,
	5274.040911,
	5587.651703,
	5919.910763,
	6271.926976,
	6644.875161,
	7040,
	7458.620184,
	7902.13282,
]
var streams = []
for (var i=1; i<=6; i+=1) {
	streams[idx(i)] = {
		id : -1,
		startTime : -1,
		stepTime : 0, // based on bpm
		bpm : 120,
		tick : 0,
		
		// song-only
		callback : null,
		shiftTime : 0, // affected by bpm changes
		loop : false,
		loopFrom : 0,
	}
}
//---------------------------------------------------------
// variables
var isVisualDebug = false
var data = null // {}
var songsByName = null // {}
var soundsByName = null // {}
var tilesByName = null // {}
var roomsByName = null // {}
var activeRoomId = null

var charWidth = tileWidth
var textChars = 17

var player = null // {}
var isDrawing = false
var isShaking = false
var acceptsInput = true
var inputStack = 0
var hasStarted = false
var hasEnded = false

var frameBitmaps = []
var arrowBitmaps = []
var pipeBitmaps = []
var charBitmaps = []
var windowBitmaps = []

var textCallback = null

var nextFreeDeferredIndex = 1
var deferred = null // list {}
var lastDx = 0
var lastDy = 0
var isPlayerDirty = true
var cropRect = null

//---------------------------------------------------------
// config (used by input)

var config = null
var resetConfig = function() {
	config = {
		follow : 0,
		followOverflowTile : "black",
		followCenterX : 12,
		followCenterY : 7,
		autoAct : 1,
		inputRepeat : 1,
		inputRepeatDelay : 0.4,
		inputRepeatBetween : 0.2,
		allowDismissRootMenu : 0,
		sayAdvanceDelay : 0.2,
		textSkip : 1,
		textSpeed : 20,
	}
}
resetConfig()

//-------------------------------------
// input

var crankState = crank()
var crankWasDocked = true
var motionXYZ = {x:0,y:1,z:0}
var trackingMotion = false
var Input,Button,ButtonState
var justPressed,isPressed,justReleased,justRepeated
{
	Button = {
		A : 1,
		B : 2,
		UP : 3,
		DOWN : 4,
		LEFT : 5,
		RIGHT : 6,
		ANY : 7,
	}
	ButtonState = {
		JUST_PRESSED : 1,
		IS_PRESSED : 2,
		JUST_RELEASED : 3,
		JUST_REPEATED : 4,
		IS_REPEATING : 5, // internal
		PRESS_ELAPSED : 6, // internal, float
	}
	
	var buttons = [
		[false,false,false,false,false,0], // Button.A
		[false,false,false,false,false,0], // Button.B
		[false,false,false,false,false,0], // Button.UP
		[false,false,false,false,false,0], // Button.DOWN
		[false,false,false,false,false,0], // Button.LEFT
		[false,false,false,false,false,0], // Button.RIGHT
	]
	
	var captureButton = function(which,isPressed) {
		var button = buttons[idx(which)]
		if ( LuaTrue( isPressed ) ) {
			button[idx(ButtonState.JUST_PRESSED)] = true
			button[idx(ButtonState.JUST_REPEATED)] = true
			button[idx(ButtonState.IS_PRESSED)] = true
			button[idx(ButtonState.PRESS_ELAPSED)] = 0
		} else {
			button[idx(ButtonState.IS_PRESSED)] = false
			button[idx(ButtonState.JUST_RELEASED)] = true
		}
	}
	var checkAny = function(state) {
		for (var which=1; which<=buttons.length; which+=1) {
			if ( LuaTrue( buttons[idx(which)][idx(state)] ) ) { return true }
		}
		return false
	}

	//---------------------------------------------------------
	
	var beforeUpdate = function() {
		if ( LuaTrue( acceptsInput ) ) {
			crankWasDocked = crankState.docked
			crankState = crank()
			if ( LuaTrue( trackingMotion ) ) {
				motionXYZ = motion()
			}
		} else {
			crankState.relative = 0
		}
	}
	var afterUpdate = function() {
		var button = null
		for (var which=1; which<=buttons.length; which+=1) {
			button = buttons[idx(which)]
			button[idx(ButtonState.JUST_PRESSED)] = false
			button[idx(ButtonState.JUST_RELEASED)] = false
			button[idx(ButtonState.JUST_REPEATED)] = false
		
			if ( LuaTrue( config.inputRepeat===1 ) ) {
				if ( LuaTrue( button[idx(ButtonState.IS_PRESSED)] ) ) {
					button[idx(ButtonState.PRESS_ELAPSED)] += frameDuration
					if ( ! LuaTrue( button[idx(ButtonState.IS_REPEATING)] ) && LuaTrue( button[idx(ButtonState.PRESS_ELAPSED)]>=config.inputRepeatDelay ) ) {
						button[idx(ButtonState.PRESS_ELAPSED)] -= config.inputRepeatDelay
						button[idx(ButtonState.IS_REPEATING)] = true
						button[idx(ButtonState.JUST_REPEATED)] = true
					} else if ( LuaTrue( button[idx(ButtonState.IS_REPEATING)] ) && LuaTrue( button[idx(ButtonState.PRESS_ELAPSED)]>=config.inputRepeatBetween ) ) {
						button[idx(ButtonState.PRESS_ELAPSED)] -= config.inputRepeatBetween
						button[idx(ButtonState.JUST_REPEATED)] = true
					}
				} else {
					button[idx(ButtonState.IS_REPEATING)] = false
				}
			}
		}
	}
	var resetInput = function() {
		for (var which=1; which<=buttons.length; which+=1) {
			var button = buttons[idx(which)]
			button[idx(ButtonState.JUST_PRESSED)] = false
			button[idx(ButtonState.IS_PRESSED)] = false
			button[idx(ButtonState.JUST_RELEASED)] = false
			button[idx(ButtonState.JUST_REPEATED)] = false
			button[idx(ButtonState.IS_REPEATING)] = false
			button[idx(ButtonState.PRESS_ELAPSED)] = 0
		}
	}

	function justPressed(which) { // bool
		if ( LuaTrue( which===Button.ANY ) ) { return checkAny(ButtonState.JUST_PRESSED) }
		return buttons[idx(which)][idx(ButtonState.JUST_PRESSED)]
	}
	function isPressed(which) { // bool
		if ( LuaTrue( which===Button.ANY ) ) { return checkAny(ButtonState.IS_PRESSED) }
		return buttons[idx(which)][idx(ButtonState.IS_PRESSED)]
	}
	function justReleased(which) { // bool
		if ( LuaTrue( which===Button.ANY ) ) { return checkAny(ButtonState.JUST_RELEASED) }
		return buttons[idx(which)][idx(ButtonState.JUST_RELEASED)]
	}
	function justRepeated(which) { // bool
		if ( LuaTrue( which === Button.ANY ) ) { return checkAny(ButtonState.JUST_REPEATED) }
		return buttons[idx(which)][idx(ButtonState.JUST_REPEATED)]
	}
	
	Input = {
		beforeUpdate : beforeUpdate,
		afterUpdate : afterUpdate,
		reset : resetInput,
	}
	
	

}

//---------------------------------------------------------

var defer = function(func) {
	while ( deferred[idx(nextFreeDeferredIndex)] ) {
		nextFreeDeferredIndex += 1
	}
	deferred[idx(nextFreeDeferredIndex)] = func
}

//---------------------------------------------------------

var TextRenderer = {
	x:3,y:3,w:17,h:4,
	lines : 0,
	pages : 0,
	bitmaps : [],
	chars : [], // chars by line
	offsets : [],

	page : 1, // in pages
	line : 1, // of page
	char : 1, // of line

	flash : false,
	elapsed : 0,
	duration : 0.5,
	
	delay : 0, // elapsed, pairs with config.sayAdvanceDelay
	
	wait : false,
	ask : false,
}

var waitForInput = function() {
	TextRenderer.wait = true
	TextRenderer.elapsed = 0
	TextRenderer.flash = false
}

//---------------------------------------------------------

var frameTimers = null // list {}
var waitTimers = null // list {}
var nextFreeTimerIndex = 1
var playTimers = null // list {}
var playTimersByRoomIndex = null // list {}
var playerIndex = (roomTilesWide * roomTilesHigh) + 1
var roomFrames = null // list {}
var newFrameTimer = function(fps) {
	if ( ! LuaTrue( frameTimers[idx(fps)] ) ) {
		frameTimers[idx(fps)] = {
			frame : 0,
			duration : 1/fps,
			elapsed : 0
		}
	}
}
var newWaitTimer = function(duration, callback) {
	while ( waitTimers[idx(nextFreeTimerIndex)] ) {
		nextFreeTimerIndex += 1
	}
	waitTimers[idx(nextFreeTimerIndex)] = {
		elapsed : 0,
		duration : duration,
		callback : callback,
	}
}
var clearPlayTimer = function(roomIndex) {
	var oldId = playTimersByRoomIndex[idx(roomIndex)]
	if ( LuaTrue( oldId ) ) {
		playTimers[idx(oldId)] = false
		playTimersByRoomIndex[idx(roomIndex)] = false
	}
}
var newPlayTimer = function(tile,roomIndex,callback) {
	roomIndex = LuaTrue(roomIndex) ? roomIndex : playerIndex
	clearPlayTimer(roomIndex)

	var id
	for (var i=1; i<=playTimers.length+1; i+=1) {
		if ( ! LuaTrue( playTimers[idx(i)] ) ) {
			id = i
			break
		}
	}
	
	var timer = {
		elapsed : 0,
		duration : 1 / tile.__fps,
		frame : 1,
		frames : tile.frames.length,
		roomIndex : roomIndex,
		callback : callback,
	}
	playTimers[idx(id)] = timer
	playTimersByRoomIndex[idx(roomIndex)] = id
}
var getFrame = function(tile,roomIndex) {
	var frames = tile.frames
	
	if ( LuaTrue( tile.fps===0 ) && LuaTrue( roomIndex ) ) {
		return frames[idx(roomFrames[idx(roomIndex)])]
	} else if ( LuaTrue( tile.id===player.id ) && LuaTrue( player.frame ) ) {
		return frames[idx(player.frame)]
	} else if ( LuaTrue( tile.fps>0 ) ) {
		return frames[idx((frameTimers[idx(tile.fps)].frame%frames.length)+1)]
	} else {
		// this is valid for frames of 0fps tiles requested by the PulpScript draw function
		// fatal('unhandled getFrame()! tile.id:'..tile.id..' tile.fps:'..tile.fps)
		return frames[idx(1)]
	}
}
var getFrameIndex = function(tile,roomIndex) {
	var frames = tile.frames
	
	if ( LuaTrue( tile.fps===0 ) && LuaTrue( roomIndex ) ) {
		return roomFrames[idx(roomIndex)]
	} else if ( LuaTrue( tile.id===player.id ) && LuaTrue( player.frame ) ) {
		return player.frame
	} else if ( LuaTrue( tile.fps>0 ) ) {
		return (frameTimers[idx(tile.fps)].frame%frames.length)+1
	} else {
		return 1
	}
}

//---------------------------------------------------------

var Action,doValue,doAction,doEvent,pushCall,say,fin,setRoom,playerAct,drawWindow,drawText,drawRect
var playSound,startSong,stopSong,stopNotes,setBpm
var runningFrame = 0
var events = null // list {}
var vars = null // {}
var store = null // {}
var modifiedStore = false
var embeds = null// list {}
var embedsByName = null // {}
var menus = null // list {}
var menuAngle = 0
var getEvent = function() {
	var event = events[idx(events.length)]
	return LuaTrue(event) ? event : { 
		game : data.name,
		player : player.tile.name,
		// TODO: set defaults for other always present values so we don't rehash the table when we set them elsewhere?
	}
}
var newEvent = function(name,self,roomIndex) {
	var event = copy(getEvent())
	
	if ( LuaTrue( activeRoomId ) ) {
		event.room = data.rooms[idx(activeRoomId)].name
	}
	
	if ( LuaTrue( name ) ) {
		event.name = name
	} else { 
		// NOTE: tell events inherit name
	}
	
	if ( LuaTrue( self ) ) {
		event.self = self
		if ( LuaTrue( self.frames ) ) { // isa Tile
			event.tile = self.name
		}
	}
	
	if ( LuaTrue( name ) && LuaTrue( event.self.script ) ) {
		if ( LuaTrue( event.self===data ) ) {
			errorSource = 'game'
		} else if ( LuaTrue( event.self.tiles ) ) {
			errorSource = 'room/'+event.self.name
		} else {
			errorSource = 'tile/'+event.self.name
		}
		
		var script = event.self.script
		if ( LuaTrue( script ) ) {
			event.blocks = script.__blocks
		}
	}
	
	// NOTE: nil-ing this if not set allows us to catch 
	// invalid tell calls but may break something else
	if ( LuaTrue( roomIndex ) ) {
		event.roomIndex = roomIndex
		// we can only determine x,y if we have a roomIndex
		event.y = math.floor((roomIndex-1) / roomTilesWide)
		event.x = (roomIndex - 1) - event.y * roomTilesWide
	}
	
	event.px = player.x
	event.py = player.y
	
	event.aa = crankState.absolute
	event.ra = crankState.relative
	event.frame = runningFrame
	
	if ( LuaTrue( trackingMotion ) ) {
		event.ax = motionXYZ.x
		event.ay = motionXYZ.y
		event.az = motionXYZ.z
	}
	
	return event
}

var handlesEvent = function(target, eventName) {
	if ( LuaTrue( target ) && LuaTrue( target.script ) ) {
		var script = target.script
		if ( LuaTrue( script[idx(eventName)] ) || LuaTrue( script[idx('any')] ) ) {
			return true
		}
	}
	return false
}

var datetime = null // {}
var expandDatetime = function() {
	datetime.year99 = datetime.year % 100
	var h = datetime.hour
	var ampm = 'am'
	if ( LuaTrue( h>=12 ) ) {
		h -= 12
		ampm = 'pm'
	}
	if ( LuaTrue( h<=0 ) ) {
		h += 12
	}
	datetime.hour12 = h
	datetime.ampm = ampm
}

var parseVarname
{
	// TODO: keep in sync!
	var eventVarnameMap = {
		[idx('event.game')] : 'game',
		[idx('event.name')] : 'name',
		[idx('event.player')] : 'player',
		[idx('event.px')] : 'px',
		[idx('event.py')] : 'py',
		[idx('event.dx')] : 'dx',
		[idx('event.dy')] : 'dy',
		[idx('event.tx')] : 'tx',
		[idx('event.ty')] : 'ty',
		[idx('event.x')] : 'x',
		[idx('event.y')] : 'y',
		[idx('event.tile')] : 'tile',
		[idx('event.room')] : 'room',
		[idx('event.aa')] : 'aa',
		[idx('event.ra')] : 'ra',
		[idx('event.frame')] : 'frame',
		[idx('event.option')] : 'option',
		[idx('event.ax')] : 'ax',
		[idx('event.ay')] : 'ay',
		[idx('event.az')] : 'az',
		[idx('event.orientation')] : 'orientation',
	}
	var configVarnameMap = {
		[idx('config.follow')] : 'follow',
		[idx('config.followOverflowTile')] : 'followOverflowTile',
		[idx('config.followCenterX')] : 'followCenterX',
		[idx('config.followCenterY')] : 'followCenterY',
		[idx('config.autoAct')] : 'autoAct',
		[idx('config.inputRepeat')] : 'inputRepeat',
		[idx('config.inputRepeatDelay')] : 'inputRepeatDelay',
		[idx('config.inputRepeatBetween')] : 'inputRepeatBetween',
		[idx('config.allowDismissRootMenu')] : 'allowDismissRootMenu',
		[idx('config.sayAdvanceDelay')] : 'sayAdvanceDelay',
		[idx('config.textSkip')] : 'textSkip',
		[idx('config.textSpeed')] : 'textSpeed',
	}
	var datetimeVarnameMap = {
		[idx('datetime.year')] : 'year', // 1900-10000
		[idx('datetime.month')] : 'month', // 1-12
		[idx('datetime.day')] : 'day', // 1-31
		[idx('datetime.weekday')] : 'weekday', // 0-6
		[idx('datetime.hour')] : 'hour', // 0-23
		[idx('datetime.minute')] : 'minute', // 0-59
		[idx('datetime.second')] : 'second', // 0-59
		[idx('datetime.millisecond')] : 'millisecond', // 0-999
		[idx('datetime.year99')] : 'year99', // 0-99 digit
		[idx('datetime.hour12')] : 'hour12', // 1-12
		[idx('datetime.ampm')] : 'ampm', // 'am' or 'pm'
		[idx('datetime.timestamp')] : 'timestamp', // seconds since 00:00:00 1/1/00 UTC
	}
	
	var accelerometerKeys = {
		ax : true,
		ay : true,
		az : true,
		orientation : true,
	}
	
	var getOrientation = function() {
		var x = motionXYZ.x
		var y = motionXYZ.y
		var z = motionXYZ.z
		
		var r = math.sqrt(x*x+y*y)
        
        if ( LuaTrue( z > r ) ) { return "on back" }
        if ( LuaTrue( z < -r ) ) { return "on front" }

        if ( LuaTrue( y > math.abs(x) ) ) { return "standing up" }
        if ( LuaTrue( y < -math.abs(x) ) ) { return "upside down" }
        if ( LuaTrue( x > math.abs(y) ) ) { return "on right" }
        return "on left"
	}
	function parseVarname(varname,set,value) {
		var src
		var readonly = false
		var fullVarname = varname
		var protected = true
		if ( LuaTrue( eventVarnameMap[idx(varname)] ) ) {
			varname = eventVarnameMap[idx(varname)]
			if ( ! LuaTrue( trackingMotion ) && LuaTrue( accelerometerKeys[idx(varname)] ) ) {
				trackingMotion = true
				startAccelerometer()
				motionXYZ = motion()
			}
			
			src = getEvent()
			readonly = true

			if ( LuaTrue( trackingMotion ) && LuaTrue( varname==='orientation' ) ) {
				src.orientation = getOrientation()
			}
		} else if ( LuaTrue( configVarnameMap[idx(varname)] ) ) {
			src = config
			varname = configVarnameMap[idx(varname)]
		} else if ( LuaTrue( datetimeVarnameMap[idx(varname)] ) ) {
			if ( ! LuaTrue( datetime ) ) { // reset after every frame, only set once per frame when requested
				datetime = getDatetime()
				expandDatetime()
			}
			src = datetime
			varname = datetimeVarnameMap[idx(varname)]
			readonly = true
		} else {
			protected = false
			src = vars
		}
	
		if ( LuaTrue( set ) ) {
			if ( LuaTrue( readonly ) ) {
				fatal(fullVarname+' is read-only!')
			} else {
				src[idx(varname)] = value
			}
		} else {
			if ( ! LuaTrue( src[idx(varname)] ) ) {
				src[idx(varname)] = 0 // NOTE: 0 is false-y in this scripting language
			}
			return src[idx(varname)]
		}
	}
}

var getVarValue = function(varname) {
	return parseVarname(varname)
}
var setVarValue = function(varname,value) {
	parseVarname(varname,true,value)
}

var _xy = {x:0,y:0}
var _rect = {x:0,y:0,w:0,h:0}
var getXY = function(value) {
	var x = LuaTrue(value[idx(2)]) ? value[idx(2)] : 0
	var y = LuaTrue(value[idx(3)]) ? value[idx(3)] : 0
	if ( LuaTrue( isTable(x) ) ) { x = doAction(x) }
	if ( LuaTrue( isTable(y) ) ) { y = doAction(y) }
	_xy.x = x
	_xy.y = y
	return _xy
}
var getRect = function(value) {
	var x = LuaTrue(value[idx(2)]) ? value[idx(2)] : 0
	var y = LuaTrue(value[idx(3)]) ? value[idx(3)] : 0
	var w = LuaTrue(value[idx(4)]) ? value[idx(4)] : 0
	var h = LuaTrue(value[idx(5)]) ? value[idx(5)] : 0
	if ( LuaTrue( isTable(x) ) ) { x = doAction(x) }
	if ( LuaTrue( isTable(y) ) ) { y = doAction(y) }
	if ( LuaTrue( isTable(w) ) ) { w = doAction(w) }
	if ( LuaTrue( isTable(h) ) ) { h = doAction(h) }
	_rect.x = x
	_rect.y = y
	_rect.w = w
	_rect.h = h
	return _rect
	
}
var getTile = function(value) {
	var tileIdent
	if ( LuaTrue( isTable(value) ) ) {
		if ( ! LuaTrue( activeRoomId ) ) {
			return fatal('Unable to get tile, no room is currently loaded')
		}
		
		var x = value.x
		var y = value.y
		var roomTiles = data.rooms[idx(activeRoomId)].tiles
		var i = (y * roomTilesWide + x) + 1
		var tileId = roomTiles[idx(i)]
		
		if ( ! LuaTrue( tileId ) ) { tileId = -1 }
		
		var tile = data.tiles[idx(tileId + 1)]
		if ( LuaTrue( tile ) ) {
			tile.roomIndex = i // NOTE: solution to tuple problem, call getRoomIndex(tile) to get and nil
			return tile
		} else {
			tileIdent = 'at '+x+','+y
		}
	} else if ( LuaTrue( isString(value) ) ) {
		var tileName = value
		var tile = tilesByName[idx(tileName)]
		if ( LuaTrue( tile ) ) {
			tile.roomIndex = null
			return tile
		} else { 
			tileIdent = ' named "'+tileName+'"'
		}
	} else {
		var tileId = value
		var tile = data.tiles[idx(tileId+1)]
		if ( LuaTrue( tile ) ) {
			tile.roomIndex = null
			return tile
		} else {
			tileIdent = ' by id '+tileId
		}
	}
	
	fatal('Unable to get tile '+tileIdent)
}
var getSong = function(value) {
	var songIdent
		if ( LuaTrue( isTable(value) ) ) {
		value = doAction(value)
	}
		if ( LuaTrue( isString(value) ) ) {
		var songName = value
		var song = songsByName[idx(songName)]
		if ( LuaTrue( song ) ) {
			return song
		} else { 
			songIdent = ' named "'+songName+'"'
		}
	} else {
		var songId = value
		var song = data.songs[idx(songId+1)]
		if ( LuaTrue( song ) ) {
			return song
		} else {
			songIdent = ' by id '+songId
		}
	}
	
	fatal('Unable to get song '+songIdent)
}
var getSound = function(value) {
	var soundIdent
		if ( LuaTrue( isTable(value) ) ) {
		value = doAction(value)
	}
		if ( LuaTrue( isString(value) ) ) {
		var soundName = value
		var sound = soundsByName[idx(soundName)]
		if ( LuaTrue( sound ) ) {
			return sound
		} else { 
			soundIdent = ' named "'+soundName+'"'
		}
	} else {
		var soundId = value
		var sound = data.sounds[idx(soundId+1)]
		if ( LuaTrue( sound ) ) {
			return sound
		} else {
			soundIdent = ' by id '+soundId
		}
	}
	
	fatal('Unable to get sound '+soundIdent)
}
var getRoomIndex = function(tile) { 
	var i = tile.roomIndex
	tile.roomIndex = null
	return i
}
var getRoom = function(value) {
	if ( LuaTrue( isString(value) ) ) {
		var roomName = value
		return roomsByName[idx(roomName)]
	} else {
		var roomId = value
		var room = data.rooms[idx(roomId+1)]
		return room
	}

	printT('invalid room identifier', value)
}

// a pocket scope to free up some Lua locals
var hidePlayer = false
{
	var nilRect = [] // sentinel for the ask menu
	
	var callstackDepth = 0
	var returnDepth = -1
	function pushCall(action) {
		callstackDepth += 1
		doAction(action)
		callstackDepth -= 1

		if ( LuaTrue( callstackDepth<returnDepth ) ) {
			returnDepth = -1
		}
	}
	
	// NOTE: args[1] is always the action name
	var ActionGet = function(args) {
		return getVarValue(args[idx(2)])
	}
	var ActionSet = function(args) {
		setVarValue(args[idx(2)], doValue(args[idx(3)]))
	}
	var ActionPadLeft = function(args) {
		return lpad(doValue(args[idx(2)]),args[idx(3)],args[idx(4)])
	}
	var ActionPadRight = function(args) {
		return rpad(doValue(args[idx(2)]),args[idx(3)],args[idx(4)])
	}
	var ActionFormat = function(args) {
		var str = []
		for (var i=2; i<=args.length; i+=1) {
			push(str, doValue(args[idx(i)]))
		}
		return join(str,'')
	}
	var ActionRandom = function(args) {
		var min = LuaTrue(args[idx(3)]) ? args[idx(2)] : 0
		var max = LuaTrue(args[idx(3)]) ? args[idx(3)] : args[idx(2)]
		return random(math.floor(doValue(min)),math.floor(doValue(max)))
	}
	var ActionFloor = function(args) {
		return math.floor(doValue(args[idx(2)]))
	}
	var ActionCeil = function(args) {
		return math.ceil(doValue(args[idx(2)]))
	}
	var ActionRound = function(args) {
		var n = doValue(args[idx(2)])
		if ( LuaTrue( n>=0 ) ) { return math.floor(n+0.5)
		} else { return math.ceil(n-0.5) }
	}
	var ActionSine = function(args) {
		return math.sin(doValue(args[idx(2)]))
	}
	var ActionCosine = function(args) {
		return math.cos(doValue(args[idx(2)]))
	}
	var ActionTangent = function(args) {
		return math.tan(doValue(args[idx(2)]))
	}
	var ActionRadians = function(args) {
		return math.rad(doValue(args[idx(2)]))
	}
	var ActionDegrees = function(args) {
		return math.deg(doValue(args[idx(2)]))
	}
	var ActionSolid = function(args) {
		var tile = getTile(doValue(args[idx(2)]))
		var i = getRoomIndex(tile)
	
		return LuaTrue(tile.solid) ? 1 : 0
	}
	var ActionType = function(args) {
		var tile = getTile(doValue(args[idx(2)]))
		var i = getRoomIndex(tile)
		
		if ( LuaTrue( tile.type===TileType.Sprite ) ) {
			return 'sprite'
		} else if ( LuaTrue( tile.type===TileType.Item ) ) {
			return 'item'
		} else if ( LuaTrue( tile.type===TileType.Player ) ) {
			return 'player' // this can happen if you use a tile name I guess
		}
		return 'world'
	}
	var ActionName = function(args) {
		var tile = getTile(doValue(args[idx(2)]))
		var i = getRoomIndex(tile)
		return tile.name
	}
	var ActionId = function(args) {
		var tile = getTile(doValue(args[idx(2)]))
		var i = getRoomIndex(tile)
		return tile.id
	}
	var ActionXY = function(args) {
		return getXY(args)
	}

	var ActionAdd = function(args) {
		var varname = args[idx(2)]
		setVarValue(varname, getVarValue(varname) + doValue(args[idx(3)]))
	}
	var ActionSub = function(args) {
		var varname = args[idx(2)]
		setVarValue(varname, getVarValue(varname) - doValue(args[idx(3)]))
	}
	var ActionMul = function(args) {
		var varname = args[idx(2)]
		setVarValue(varname, getVarValue(varname) * doValue(args[idx(3)]))
	}
	var ActionDiv = function(args) {
		var varname = args[idx(2)]
		setVarValue(varname, getVarValue(varname) / doValue(args[idx(3)]))
	}
	var ActionInc = function(args) {
		var varname = args[idx(2)]
		setVarValue(varname, getVarValue(varname) + 1)
	}
	var ActionDec = function(args) {
		var varname = args[idx(2)]
		setVarValue(varname, getVarValue(varname) - 1)
	}

	var ActionEq = function(args) {
		return getVarValue(args[idx(2)])===doValue(args[idx(3)])
	}
	var ActionNeq = function(args) {
		return getVarValue(args[idx(2)])!==doValue(args[idx(3)])
	}
	var ActionGt = function(args) {
		return getVarValue(args[idx(2)])>doValue(args[idx(3)])
	}
	var ActionLt = function(args) {
		return getVarValue(args[idx(2)])<doValue(args[idx(3)])
	}
	var ActionGte = function(args) {
		return getVarValue(args[idx(2)])>=doValue(args[idx(3)])
	}
	var ActionLte = function(args) {
		return getVarValue(args[idx(2)])<=doValue(args[idx(3)])
	}

	var getBlock = function(blockId) {
		var event = getEvent()
		if ( LuaTrue( event.blocks ) ) {
			return event.blocks[idx(blockId+1)] || []
		}
		return []
	}
	var ActionBlock = function(args) {
		var actions = getBlock(args[idx(2)])
		for (var i=1; i<=actions.length; i+=1) {
			errorLine += 1
			doAction(actions[idx(i)])
		}
		errorLine += 1 // because of `end`
	}
	var ActionWhile = function(args) {
		var iterations = 0
		while ( doAction(args[idx(2)]) ) {
			if ( LuaTrue( iterations>400 ) ) {
				fatal('Too many iterations (max: 400). Did you forget to update your escape condition?')
				break
			}
			doAction(args[idx(3)])
			iterations += 1
		}
	}
	var ActionIf = function(args) {
		if ( LuaTrue( doAction(args[idx(2)]) ) ) {
			doAction(args[idx(3)])
		} else {
			for (var i=4; i<=args.length; i+=1) {
				var action = args[idx(i)]
				if ( LuaTrue( action[idx(1)]==='elseif' ) && LuaTrue( doAction(action[idx(2)]) ) ) {
					doAction(action[idx(3)])
					break
				} else if ( LuaTrue( action[idx(1)]==='else' ) ) {
					doAction(action[idx(2)])
				}
			}
		}
	}

	var ActionAct = function(args) {
		playerAct()
	}
	
	var ActionLog = function(args) {
		print(doValue(args[idx(2)]))
	}
	var ActionDump = function(args) {
		var dump = []
		var sub = [ '', '', '']
		var c = dump.length
		
		push(dump, '================')
		push(dump, 'EVENT')
		var event = getEvent()
		var eventKeys = [
			'name',
			'game',
			'player',
			'px','py',
			'dx','dy',
			'tx','ty',
			'x','y',
			'tile',
			'room',
			'aa','ra',
			'frame',
			'option',
		]
		for (var i=1; i<=eventKeys.length; i+=1) {
			var k = eventKeys[idx(i)]
			if ( LuaTrue( event[idx(k)] ) ) {
				sub[idx(2)] = k
				sub[idx(3)] = event[idx(k)]
				push(dump, join(sub, '\t'))
			}
		}

		push(dump, 'GAME')
		c = dump.length
		for (var k in vars) { var v = vars[k];
			sub[idx(2)] = k
			sub[idx(3)] = v
			push(dump, join(sub, '\t'))
		}
		if ( LuaTrue( c===dump.length ) ) { push(dump, '\t') }

		push(dump, 'STORE')
		c = dump.length
		for (var k in store) { var v = store[k];
			sub[idx(2)] = k
			sub[idx(3)] = v
			push(dump, join(sub, '\t'))
		}
		if ( LuaTrue( c===dump.length ) ) { push(dump, '\t') }

		push(dump, 'CONFIG')
		for (var k in config) { var v = config[k];
			sub[idx(2)] = k
			sub[idx(3)] = v
			push(dump, join(sub, '\t'))
		}
		
		print(join(dump, '\n'))
	}
	var ActionSay = function(args) {
		var rect = LuaTrue(args[idx(4)]) ? getRect(args[idx(4)]) : null
		say(args[idx(2)],args[idx(3)], rect)
	}
	var ActionAsk = function(args) {
		TextRenderer.ask = true // leaves text window up
		var rect = LuaTrue(args[idx(4)]) ? getRect(args[idx(4)]) : null
		say(args[idx(2)], ['menu',nilRect,args[idx(3)]], rect)
	}
	var ActionFin = function(args) {
		var rect = LuaTrue(args[idx(3)]) ? getRect(args[idx(3)]) : null
		fin(args[idx(2)], rect)
	}
	var ActionCall = function(args) {
		var runningLine = errorLine
		var eventName = doValue(args[idx(2)])
		doEvent(newEvent(eventName))
		errorLine = runningLine
	}
	var ActionSwap = function(args) {
		var tile = getTile(doValue(args[idx(2)]))
		if ( ! LuaTrue( tile ) ) { return }
		
		var event = getEvent()
		if ( LuaTrue( event.self===player.tile ) ) {
			player.id = tile.id
			player.frame = null
			clearPlayTimer(playerIndex)
		} else {
			if ( LuaTrue( event.self ) && LuaTrue( event.self.tiles ) ) {
				fatal('Tried to swap tile on a room,\nuse tell x,y to target a specific instance\nof a tile')
			}
			if ( LuaTrue( event.coordinatelessTell ) ) {
				fatal('Tried to swap tile on a tile prototype\nin the "'+event.tellSourceEvent+'" event callback of "'+event.tellSourceTile+'",\nuse tell x,y to target a specific instance\nof a tile')
			}
			clearPlayTimer(event.roomIndex)
			data.rooms[idx(activeRoomId)].tiles[idx(event.roomIndex)] = tile.id
			roomFrames[idx(event.roomIndex)] = 1
			event.self = tile
		}
	}
	var ActionEmit = function(args) {
		var runningLine = errorLine
		var eventName = doValue(args[idx(2)])

		if ( LuaTrue( handlesEvent(data, eventName) ) ) {
			doEvent(newEvent(eventName, data)) // game
			if ( LuaTrue( hasEnded ) ) { return }
		} else {
			if ( LuaTrue( activeRoomId ) ) {
				// buh
			} else {
				if ( LuaTrue( hasEnded ) ) {
					fatal('The game has ended and the room and its tiles have been unloaded so they cannot receive this "'+eventName+'" event.')
				} else {
					warn('No room or tiles have been loaded yet so they cannot receive this "'+eventName+'" event. Emit from the "enter" event to message tiles in the starting room.')
				}
				return
			}
		}
		
		var room = data.rooms[idx(activeRoomId)]
		if ( LuaTrue( handlesEvent(room, eventName) ) ) {
			doEvent(newEvent(eventName, room))
			if ( LuaTrue( hasEnded ) ) { return }
		}
		
		if ( LuaTrue( handlesEvent(player.tile, eventName) ) ) {
			doEvent(newEvent(eventName, player.tile))
			if ( LuaTrue( hasEnded ) ) { return }
		}
		
		var roomTiles = copy(room.tiles)
		for (var i=1; i<=roomTiles.length; i+=1) {
			var tileId = roomTiles[idx(i)]
			var tile = data.tiles[idx(tileId+1)]
			if ( LuaTrue( tile ) && LuaTrue( tile.type!==TileType.World ) && LuaTrue( handlesEvent(tile, eventName) ) ) {
				doEvent(newEvent(eventName, tile,i))
				if ( LuaTrue( hasEnded ) ) { return }
			}
		}
		errorLine = runningLine
	}
	var ActionTell = function(args) {
		// TODO: this feels...not great
		var target = args[idx(2)]
		if ( LuaTrue( isTable(target) ) && LuaTrue( target[idx(1)]==='get' ) ) {
			if ( LuaTrue( target[idx(2)]==='event.room' ) ) {
				if ( LuaTrue( activeRoomId ) ) {
					push(events, newEvent(null, data.rooms[idx(activeRoomId)]))
					doAction(args[idx(3)])
					pop(events) 
				} else {
					if ( LuaTrue( hasEnded ) ) {
						warn('The game is over, the room has been unloaded')
					} else {
						warn('No room has been loaded yet')
					}
				}
				return
			} else if ( LuaTrue( target[idx(2)]==='event.game' ) ) {
				push(events, newEvent(null, data))
				doAction(args[idx(3)])
				pop(events) 
				return
			}
		}
	
		var tile = getTile(doValue(target))
		var i = getRoomIndex(tile)
		var event = newEvent(null, tile,i)
		if ( ! LuaTrue( i ) ) {
			var srcEvent = getEvent()
			event.coordinatelessTell = true
			if ( LuaTrue( srcEvent.self===data ) ) {
				event.tellSourceTile = 'game'
			} else {
				event.tellSourceTile = srcEvent.self.name
			}
			event.tellSourceEvent = srcEvent.name
		} else {
			event.coordinatelessTell = null
			event.tellSourceTile = null
			event.tellSourceEvent = null
		}
		push(events, event)
		doAction(args[idx(3)])
		pop(events) 
	}
	var ActionFrame = function(args) {
		var argCount = args.length-1
		var event = getEvent()
		if ( LuaTrue( argCount===0 ) ) {
			return getFrameIndex(event.self, event.roomIndex)-1
		} else if ( LuaTrue( argCount===1 ) ) {
			var frame = doValue(args[idx(2)])
			if ( LuaTrue( event.self===player.tile ) ) {
				player.frame = frame+1
			} else {
				if ( LuaTrue( event.coordinatelessTell ) ) {
					fatal('Tried to change frame on a tile prototype\nin the "'+event.tellSourceEvent+'" event callback of "'+event.tellSourceTile+'",\nuse tell x,y to target a specific instance\nof a tile')
				}
				roomFrames[idx(event.roomIndex)] = frame+1
			}
		} else if ( LuaTrue( argCount===2 ) ) {
			_xy.x = doValue(args[idx(2)])
			_xy.y = doValue(args[idx(3)])
			var tile = getTile(_xy)
			return getFrameIndex(tile, tile.roomIndex)-1
		}
	}
	var ActionShake = function(args) {
		var event = getEvent()
		var callback = args[idx(3)]
		isShaking = true
		defer(function() {
			newWaitTimer(doValue(args[idx(2)]), function() {
				isShaking = false
				offset(0,0)
				if ( LuaTrue( callback ) ) {
					push(events, event)
					pushCall(callback)
					pop(events) 
				}
			})
		})
	}
	var ActionWait = function(args) {
		var event = getEvent()
		var callback = args[idx(3)]
		var duration = doValue(args[idx(2)])
		defer(function() {
			newWaitTimer(duration, function() {
				push(events, event)
				pushCall(callback)
				pop(events) 
			})
		})
	}
	var ActionPlay = function(args) {
		ActionSwap(args)
	
		var event = getEvent()

		var tile = event.self
	
		var roomIndex = event.roomIndex
		if ( LuaTrue( tile===player.tile ) ) {
			tile = data.tiles[idx(player.id+1)]
			roomIndex = playerIndex
		}
	
		if ( ! LuaTrue( tile.__fps ) ) {
			tile.__fps = tile.fps
			tile.fps = 0
		}
	
		ActionFrame(['frame',0])
	
		var callback = args[idx(3)]
		newPlayTimer(tile, roomIndex, callback && function() {
			push(events, event)
			pushCall(callback)
			pop(events) 
		})
	}

	var ignoreFrame = -1
	var ActionIgnore = function(args) {
		ignoreFrame = runningFrame
		inputStack += 1
		if ( LuaTrue( inputStack > 0 ) ) {
			acceptsInput = false
		}
	}
	var ActionListen = function(args) {
		if ( LuaTrue( ignoreFrame===runningFrame ) ) {
			warn('Called listen on same frame as ignore. Did you mean to put listen inside a wait or say then block?')
		}
	
		inputStack -= 1
		if ( LuaTrue( inputStack <= 0 ) ) {
			inputStack = 0
			acceptsInput = true
		}
	}

	var ActionHide = function(args) {
		if ( ! LuaTrue( isDrawing ) ) { return }
		hidePlayer = true
	}
	var ActionDraw = function(args) {
		if ( ! LuaTrue( isDrawing ) ) { return }
	
		var tile = getTile(doValue(args[idx(2)]))
		var i = getRoomIndex(tile)
		var pos = getXY(args[idx(3)])
		var frame = LuaTrue(tile.onlyFrame) ? tile.onlyFrame : getFrame(tile,i)
		drawBitmap(frameBitmaps[idx(frame+1)],pos.x*tileWidth,pos.y*tileHeight)
		// TODO: handle config.follow==1
		// NOTE: not necessary since manual drawing ignores player offset :tada:
		var j = pos.y * roomTilesWide + pos.x + 1
		drawnRoomFrames[idx(j)] = -1
	}
	var ActionDrawWindow = function(args) {
		if ( ! LuaTrue( isDrawing ) ) { return }
		
		var rect = getRect(args[idx(2)])
		if ( LuaTrue( rect.w===0 ) ) { rect.w = 2 }
		if ( LuaTrue( rect.h===0 ) ) { rect.h = 2 }
		drawWindow(rect.x, rect.y, rect.w, rect.h)
	}
	var ActionDrawLabel = function(args) {
		if ( ! LuaTrue( isDrawing ) ) { return }
		
		var label = doValue(args[idx(2)])
		var rect = getRect(args[idx(3)])

		var maxChars
		if ( LuaTrue( rect.w>0 ) ) {
			maxChars = rect.w
		}
		
		var lines = split(label, '\n')
		var maxLines = lines.length
		if ( LuaTrue( rect.h>0 ) && LuaTrue( rect.h<maxLines ) ) {
			maxLines = rect.h
		}
		
		for (var i=1; i<=maxLines; i+=1) {
			drawText(lines[idx(i)], rect.x,rect.y+i-1, maxChars)
		}
	}
	var ActionDrawRect = function(args) {
		if ( ! LuaTrue( isDrawing ) ) { return }
		
		var color = doValue(args[idx(2)])
		var rect = getRect(args[idx(3)])
		if ( LuaTrue( rect.w===0 ) ) { return }
		if ( LuaTrue( rect.h===0 ) ) { return }
		drawRect(color, rect.x, rect.y, rect.w, rect.h)
	}
	var isInverted = false
	var ActionInvert = function(args) {
		isInverted = ! isInverted
		invert(isInverted)
		return LuaTrue(isInverted) ? 1 : 0
	}
	var validateOption = false
	var validatedOptions // list {}
	var ActionMenu = function(args) {
		var rect = getRect(args[idx(2)])
		
		validateOption = true
		validatedOptions = []
		doAction(args[idx(3)]) // a validation pass
		validateOption = false
		// validatedOptions now contains a list of valid names
		
		var pageRows = LuaTrue(validatedOptions) ? validatedOptions.length : 0
		
		if ( LuaTrue( pageRows===0 ) ) {
			if ( LuaTrue( TextRenderer.ask ) ) {
				// NOTE: ask leaves its window open while the options are displayed
				// if there are no options we need to force the window shut
				TextRenderer.lines = 0
				TextRenderer.ask = false
			}
			warn('Opened a menu with zero valid options')
			return
		}
		
		var options = []
		var mostCharsPerOption = 0
		var count = pageRows
		for (var i=1; i<=pageRows; i+=1) {
			var value = doValue(validatedOptions[idx(i)])
			var len = value.length
			if ( LuaTrue( len>mostCharsPerOption ) ) { 
				mostCharsPerOption = len 
			}
			options[idx(i)] = value
		}
		validatedOptions = null
		
		var tilesPerOption = mostCharsPerOption
		if ( LuaTrue( charWidth!==tileWidth ) ) {
			tilesPerOption = math.ceil(mostCharsPerOption / 2)
		}
		
		// nilRect is the ask sentinel, so we 
		// calculate position from the bottom-
		// right corner of the ask window
		if ( LuaTrue( args[idx(2)]===nilRect ) ) {
			rect.w = 8
			if ( LuaTrue( count>=6 ) ) {
				rect.h = 4
			}
			if ( LuaTrue( tilesPerOption<rect.w ) ) {
				rect.w = tilesPerOption
			}
			rect.x = TextRenderer.x + TextRenderer.w - rect.w - 2
			rect.y = TextRenderer.y + TextRenderer.h
		}
		
		if ( LuaTrue( rect.w>0 ) ) {
			tilesPerOption = rect.w
		} else {
			rect.w = tilesPerOption
		}
		
		if ( LuaTrue( rect.h>0 ) ) {
			pageRows = rect.h
		} else {
			rect.h = pageRows
		}
		
		var w = rect.w
		var h = rect.h
		
		var maxCharTiles = roomTilesWide-3
		if ( LuaTrue( w>maxCharTiles ) ) {
			w = maxCharTiles
		}
	
		var maxLineTiles = roomTilesHigh-2
		if ( LuaTrue( h>maxLineTiles ) ) {
			h = maxLineTiles
		}
		
		mostCharsPerOption = w
		if ( LuaTrue( charWidth!==tileWidth ) ) {
			mostCharsPerOption *= 2
		}
		
		w += 3
		h += 2
		
		ignoreDraw += 1
		var window = newBitmap(w*tileWidth, h*tileHeight, Color.White)
		pushContext(window)
		drawWindow(0,0,w,h)
		popContext()

		var pages = math.ceil(count / pageRows)
		var pageCols = tilesPerOption+1
		var text = newBitmap((pages * pageCols)*tileWidth, pageRows*tileHeight, Color.Clear)

		pushContext(text)
		var x = 0
		var y = 0
		for (var i=1; i<=count; i+=1) {
			var value = options[idx(i)]
			var maxChars
			if ( LuaTrue( value.length>mostCharsPerOption ) ) {
				maxChars = mostCharsPerOption
				// value = substring(value,0,max)
			}
			drawText(value, x,y, maxChars)
			y += 1
			if ( LuaTrue( y>=pageRows ) ) {
				x += pageCols
				y = 0
			}
		}
		popContext()
		ignoreDraw -= 1
		
		var menu = {
			x : rect.x,
			y : rect.y,
			w : w,
			h : h,
			selected : 1,
			count : count,
			pages : pages,
			pageCols : pageCols,
			pageRows : pageRows,
			window : window,
			text : text,
			options : options,
		}
		var event = getEvent()
		menu.callback = function() {
			push(events, event)
			pushCall(args[idx(3)])
			pop(events) 
			// dirtyRoom()
		}
		push(menus,menu)
		menuAngle = 0
		
		var changeEvent = newEvent('change', data)
		changeEvent.option = menu.options[idx(menu.selected)]
		doEvent(changeEvent)
	}
	var ActionOption = function(args) {
		if ( LuaTrue( validateOption ) ) {
			push(validatedOptions, args[idx(2)])
			args[idx(3)] = validatedOptions.length // close up gaps in option list
			return
		}
		var menu = menus[idx(menus.length)]
		if ( LuaTrue( args[idx(3)]===menu.selected ) ) {
			var event = getEvent()
			event.option = menu.options[idx(menu.selected)]
			doAction(args[idx(4)])
			event.option = null
		}
	}
	var ActionGoto = function(args) {
		var pos = getXY(args[idx(2)])
		var x = pos.x
		var y = pos.y
		var i = (y * roomTilesWide + x) + 1
	
		var room
		if ( LuaTrue( args[idx(3)] ) ) {
			room = getRoom(doValue(args[idx(3)]))
		}
	
		var event = getEvent()
		if ( LuaTrue( room ) && LuaTrue( room.name!==event.room ) ) {
			if ( LuaTrue( event.name==='exit' ) ) {
				fatal('Using goto inside an exit event\nhandler creates an interminal loop')
			}
			setRoom(room.id+1, function() {
				player.x = x
				player.y = y
			})
		} else {
			if ( LuaTrue( config.follow!==1 ) ) {
				var h = (player.y * roomTilesWide + player.x) + 1
				drawnRoomFrames[idx(h)] = -1 // force redraw of previous tile
			}
			
			var dx = x - player.x
			var dy = y - player.y		
			player.x = x
			player.y = y
			var event = newEvent('update', player.tile,i)
			event.dx = dx
			event.dy = dy
			doEvent(event)
		}
	}
	var ActionMimic = function(args) {
		var tile = getTile(doValue(args[idx(2)]))
		var i = getRoomIndex(tile)
		var event = getEvent()
		doEvent(newEvent(event.name, tile,i))
	}

	var ActionEmbed = function(args) {
		var tile = getTile(args[idx(2)])
		var i = getRoomIndex(tile)
		
		var embedId = embedsByName[idx(tile.name)]
		if ( ! LuaTrue( embedId ) ) {
			var frameId = tile.frames[idx(1)] + 1
			push(embeds, frameId);
			embedId = embeds.length 
			embedsByName[idx(tile.name)] = embedId
		}
		return fromAscii(127 + embedId)
	}
	var ActionSound = function(args) { 
		playSound(args[idx(2)], args[idx(3)])
	}
	var ActionLoop = function(args) {
		startSong(args[idx(2)])
	}
	var ActionOnce = function(args) {
		startSong(args[idx(2)], true, args[idx(3)])
	}
	var ActionStop = function(args) {
		stopSong()
	}
	var ActionBpm = function(args) {
		if ( LuaTrue( streams[idx(1)].id===-1 ) ) { return }
		setBpm(doValue(args[idx(2)]))
	}
	
	var ActionStore = function(args) {
		if ( LuaTrue( args[idx(2)] ) ) {
			var varname = doValue(args[idx(2)])
			store[idx(varname)] = getVarValue(varname)
			modifiedStore = true
		} else {
			saveStore()
		}
	}
	var ActionRestore = function(args) {
		if ( LuaTrue( args[idx(2)] ) ) {
			var varname = doValue(args[idx(2)])
			var value = LuaTrue(store[idx(varname)]) ? store[idx(varname)] : 0
			setVarValue(varname,value)
		} else {
			for (var varname in store) { var value = store[varname];
				setVarValue(varname,value)
			}
		}
	}
	var ActionToss = function(args) {
		if ( LuaTrue( args[idx(2)] ) ) {
			store[idx(doValue(args[idx(2)]))] = null
		} else {
			store = {}
		}
		modifiedStore = true
	}
	
	var ActionCrop = function(args) {
		var rect = getRect(args[idx(2)])
		
		var x = rect.x
		var y = rect.y
		var w = rect.w
		var h = rect.h
		
		if ( LuaTrue( x<0 ) ) { 
			x = 0
		} else if ( LuaTrue( x>roomTilesWide-1 ) ) {
			x = roomTilesWide-1
		}
		if ( LuaTrue( y<0 ) ) {
			y = 0
		} else if ( LuaTrue( y>roomTilesHigh-1 ) ) {
			y = roomTilesHigh-1
		}
		if ( LuaTrue( w<1 ) ) { w = 1 }
		if ( LuaTrue( h<1 ) ) { h = 1 }
		if ( LuaTrue( x+w>roomTilesWide ) ) { w = roomTilesWide-x }
		if ( LuaTrue( y+h>roomTilesHigh ) ) { h = roomTilesHigh-y }
		
		if ( LuaTrue( x!==rect.x ) || LuaTrue( y!==rect.y ) || LuaTrue( w!==rect.w ) || LuaTrue( h!==rect.h ) ) {
			warn('Invalid crop {x='+rect.x+',y='+rect.y+',width='+rect.w+',height='+rect.h+'} changed to {x='+x+',y='+y+',width='+w+',height='+h+'}')
		}
		
		cropRect.x = x
		cropRect.y = y
		cropRect.w = w
		cropRect.h = h
	}
	
	var ActionDebugLine = function(args) {
		errorLine = args[idx(2)]
	}

	var ActionNOP = function() { }
	
	var ActionDone = function() {
		returnDepth = callstackDepth
	}

	Action = {
		get : ActionGet,
		set : ActionSet,
		lpad : ActionPadLeft,
		rpad : ActionPadRight,
		format : ActionFormat,
		xy : ActionXY,
		random : ActionRandom,
		floor : ActionFloor,
		ceil : ActionCeil,
		round : ActionRound,
		
		sine : ActionSine,
		cosine : ActionCosine,
		tangent : ActionTangent,
		radians : ActionRadians,
		degrees : ActionDegrees,
		
		solid : ActionSolid,
		type : ActionType,
		name : ActionName,
		id : ActionId,
	
		add : ActionAdd,
		sub : ActionSub,
		mul : ActionMul,
		div : ActionDiv,
		inc : ActionInc,
		dec : ActionDec,
	
		eq : ActionEq,
		neq : ActionNeq,
		gt : ActionGt,
		lt : ActionLt,
		gte : ActionGte,
		lte : ActionLte,
	
		block : ActionBlock,
		[idx('if')] : ActionIf,
		[idx('while')] : ActionWhile,
		
		act : ActionAct,
		log : ActionLog,
		dump : ActionDump,
		say : ActionSay,
		ask : ActionAsk,
		call : ActionCall,
		swap : ActionSwap,
		emit : ActionEmit,
		tell : ActionTell,
		frame : ActionFrame,
		shake : ActionShake,
		wait : ActionWait,
		play : ActionPlay,
		fin : ActionFin,
		
		hide : ActionHide,
		draw : ActionDraw,
		fill : ActionDrawRect,
		window : ActionDrawWindow,
		label : ActionDrawLabel,
		invert : ActionInvert,
		menu : ActionMenu,
		option : ActionOption,
		
		[idx('goto')] : ActionGoto,
		mimic : ActionMimic,
	
		ignore : ActionIgnore,
		listen : ActionListen,
	
		embed : ActionEmbed,
	
		loop : ActionLoop,
		once : ActionOnce,
		stop : ActionStop,
		bpm : ActionBpm,
		sound : ActionSound,
		
		store : ActionStore,
		restore : ActionRestore,
		toss : ActionToss,
		
		crop : ActionCrop,

		done : ActionDone,

		_ : ActionDebugLine,
		
		[idx('#')] : ActionNOP,
		[idx('#$')] : ActionNOP,
	}
	function doValue(value) {
		if ( LuaTrue( isTable(value) ) ) {
			return doAction(value)
		}
		return value
	}
	function doAction(args) {
		if ( LuaTrue( args===-1 ) ) { return } // newline
		if ( LuaTrue( callstackDepth===returnDepth ) ) { return }
		
		var action = args[idx(1)]
		if ( ! LuaTrue( Action[idx(action)] ) ) { return print('unknown action:', action) }
		
		return Action[idx(action)](args)
	}
	function doEvent(event) {
		var script
		if ( LuaTrue( event.self.script ) ) {
			script = event.self.script
		}
	
		if ( LuaTrue( script ) ) {
			if ( LuaTrue( script[idx('any')] ) ) { // special any event handler fires before any event the object may receive
				push(events, event)
				pushCall(script[idx('any')])
				pop(events)
			}
			if ( LuaTrue( script[idx(event.name)] ) ) {
				push(events, event)
				pushCall(script[idx(event.name)])
				pop(events) 
			}
		} else {
			if ( LuaTrue( event.self===data ) && LuaTrue( event.name==='load' ) && LuaTrue( data.intro!=='' ) ) {
				say(data.intro)
			} else if ( LuaTrue( event.name==='collect' ) || LuaTrue( event.name==='interact' ) ) {
				var says = LuaTrue(event.self) ? event.self.says : null
				var sound = LuaTrue(event.self) ? event.self.sound : null

				if ( LuaTrue( event.name==='collect' ) ) {
					var varname = event.self.name+'s'
					var value = getVarValue(varname)
					setVarValue(varname, value+1)

					push(events, event)
					ActionSwap(['swap', data.background])
					pop(events) 
				}
				
				if ( LuaTrue( says ) && LuaTrue( says!=='' ) ) {
					say(says)
				}
				
				if ( LuaTrue( sound ) && LuaTrue( sound!==-1 ) ) {
					playSound(sound)
				}
			}
		}
	}
}

//---------------------------------------------------------




//---------------------------------------------------------

function setRoom(roomId, xyFunc) {
	if ( LuaTrue( activeRoomId ) ) {
		var room = data.rooms[idx(activeRoomId)]
		var roomTiles = room.tiles
		
		var eventName = 'exit'
		var event = newEvent(eventName, data)
		event.room = room.name
		doEvent(event)
		doEvent(newEvent(eventName, room))
		
		for (var i=1; i<=roomTiles.length; i+=1) {
			var tileId = roomTiles[idx(i)]
			
			if ( ! LuaTrue( tileId ) ) { continue }
			
			var tile = data.tiles[idx(tileId+1)]
			if ( LuaTrue( tile.type===TileType.World ) ) { continue }
			if ( LuaTrue( handlesEvent(tile, eventName) ) ) {
				doEvent(newEvent(eventName, tile,i))
			}
			
		}
		
		var event = newEvent('exit', player.tile)
		event.room = room.name
		doEvent(event)
	}
	
	saveStore()
	
	hasStarted = true
	
	defer(function() {
		lastDx = 0
		lastDy = 0
		isPlayerDirty = true
		if ( LuaTrue( xyFunc ) ) { xyFunc() }

		activeRoomId = roomId
		var room = data.rooms[idx(activeRoomId)]
		var roomTiles = room.tiles

		roomFrames = copy(defaultRoomFrames)
		playTimers = []
		playTimersByRoomIndex = []
		
		if ( LuaTrue( room.song===-2 ) ) {
			stopSong()
		} else if ( LuaTrue( room.song!==-1 ) ) {
			startSong(room.song) // can be overridden by room's script
		}
		
		doEvent(newEvent('enter', data))
		doEvent(newEvent('enter', room))
		for (var i=1; i<=roomTiles.length; i+=1) {
			drawnRoomFrames[idx(i)] = -1 // dirty room
			
			var tileId = roomTiles[idx(i)]
			
			if ( ! LuaTrue( tileId ) ) { continue }
			
			var tile = data.tiles[idx(tileId+1)]
			if ( LuaTrue( tile.type===TileType.World ) ) { continue }
			doEvent(newEvent('enter', tile,i))
			
		}
	
		doEvent(newEvent('enter', player.tile))
	})
}




var hasCache = false
var cacheBitmaps = function() {
	if ( LuaTrue( hasCache ) ) { 
		print('using cached bitmaps!')
	} else {
		ignoreDraw += 1
		print('caching bitmaps...')
		// frames
		

			print('\tusing data.frames')
			// NOTE: still required for JavaScript player
			for (var i=1; i<=data.frames.length; i+=1) {
				var frame = data.frames[idx(i)]
				if ( ! LuaTrue( frame ) ) { continue }
	
				var bitmap = newBitmap(tileWidth,tileHeight,Color.White)
				pushContext(bitmap)
				setColor(Color.Black)
				for (var y=1; y<=tileHeight; y+=1) {
					for (var x=1; x<=tileWidth; x+=1) {
						var j = (y-1) * tileWidth + x
						var f = frame.data[idx(j)]
						if ( LuaTrue( f===1 ) ) { // NOTE: we only need to draw black pixels since the bitmap starts filled with white
							drawPixel(x-1,y-1)
						} else if ( LuaTrue( f===2 ) ) { // player tiles may have transparent pixels now
							setColor(Color.Clear)
							drawPixel(x-1,y-1)
							setColor(Color.Black)
						}
					}
				}
				popContext()
				frameBitmaps[idx(i)] = bitmap
				
			}
			

	
		// border
		var cols = 1 + textChars + 1
		var rows = 1 + textLines + 1
		

			print('\tusing data.font.pipe')
			// NOTE: still required for JavaScript player
			for (var i=1; i<=data.font.pipe.length; i+=1) {
				var frame = data.font.pipe[idx(i)]
				var bitmap = newBitmap(tileWidth,tileHeight,Color.White)
				pushContext(bitmap)
				setColor(Color.Black)
				for (var y=1; y<=tileHeight; y+=1) {
					for (var x=1; x<=tileWidth; x+=1) {
						var j = (y-1) * tileWidth + x
						if ( LuaTrue( frame[idx(j)]===1 ) ) { // NOTE: we only need to draw black pixels since the bitmap starts filled with white
							drawPixel(x-1,y-1)
						}
					}
				}
				popContext()
				pipeBitmaps[idx(i)] = bitmap
			}
			

	
		// arrows
		arrowBitmaps[idx(1)] = pipeBitmaps[idx(10)]
		arrowBitmaps[idx(2)] = pipeBitmaps[idx(11)]
		arrowBitmaps[idx(3)] = pipeBitmaps[idx(12)]
		arrowBitmaps[idx(4)] = pipeBitmaps[idx(13)]
		arrowBitmaps[idx(5)] = pipeBitmaps[idx(14)]
	
		// chars
		if ( LuaTrue( data.font.type===FontType.HalfWidth ) ) {
			charWidth /= 2
			textChars *= 2
		}
	
		

			print('\tusing data.font.chars')
			// NOTE: still required for JavaScript player
			for (var i=1; i<=data.font.chars.length; i+=1) {
				var frame = data.font.chars[idx(i)]
				var bitmap = newBitmap(charWidth,tileHeight,Color.White)
				pushContext(bitmap)
				setColor(Color.Black)
				for (var y=1; y<=tileHeight; y+=1) {
					for (var x=1; x<=charWidth; x+=1) {
						var j = (y-1) * tileWidth + x
						if ( LuaTrue( frame[idx(j)]===1 ) ) { // NOTE: we only need to draw black pixels since the bitmap starts filled with white
							drawPixel(x-1,y-1)
						}
					}
				}
				popContext()
				charBitmaps[idx(i)] = bitmap
			}
			

		ignoreDraw -= 1
	}
	
	hasCache = true

	// reduce memory footprint
	data.frames = null
	data.font = null
}

var _env = {}
var applyEnvelope = function(voice, envelope) {
	for (var key in defaultEnvelope) { var value = defaultEnvelope[key];
		if ( LuaTrue( envelope ) && LuaTrue( envelope[idx(key)] ) ) {
			_env[idx(key)] = envelope[idx(key)]
		} else {
			_env[idx(key)] = value
		}
	}
	setEnvelope(voice, _env.attack,_env.decay,_env.sustain,_env.release, _env.volume)
}

function playSound(value) {
	var sound = getSound(value)
	var stream = streams[idx(sound.type + 2)]
		
	stream.id = sound.id
	stream.startTime = -1
	stream.stepTime = (60 / sound.bpm) * 0.25
	stream.bpm = sound.bpm
	stream.tick = 0
}
function startSong(value, once, callback) {
	var song = getSong(value)
	var stream = streams[idx(1)]
	
	if ( LuaTrue( stream.id===song.id ) ) { return }
	if ( LuaTrue( stream.id>-1 ) ) { stopSong() }
	
	stream.id = song.id
	stream.startTime = -1
	stream.stepTime = (60 / song.bpm) * 0.25
	stream.bpm = song.bpm
	stream.tick = 0
	
	for (var i=1; i<=voices.length; i+=1) {
		applyEnvelope(voices[idx(i)], song.voices && song.voices[idx(i)])
	}
	
	stream.shiftTime = 0
	stream.loop = ! once
	stream.loopFrom = 0
	if ( LuaTrue( once ) && LuaTrue( callback ) ) {
				var event = getEvent()
				stream.callback = function() {
						push(events, event)
						pushCall(callback)
						pop(events) 
					}
	} else {
		stream.callback = null
	}
}
function setBpm(bpm) {
	if ( LuaTrue( bpm>240 ) ) {
		warn('Invalid bpm ('+bpm+') must be less than or equal to 240')
		bpm = 240
	} else if ( LuaTrue( bpm<1 ) ) {
		warn('Invalid bpm ('+bpm+') must be greater than or equal to 1')
		bpm = 1
	}
	
	var stream = streams[idx(1)]
	var stepTime = stream.stepTime
	stream.stepTime = (60 / bpm) * 0.25
	stream.shiftTime += (stepTime - stream.stepTime) * stream.tick
	stream.bpm = bpm
}
function stopNotes() {
	for (var i=1; i<=voices.length; i+=1) {
		stopNote(voices[idx(i)])
	}
}
function stopSong() {
	var stream = streams[idx(1)]
	if ( LuaTrue( stream.id>-1 ) ) {
		stream.id = -1
		stopNotes()
	}
}

var scheduleNote = function(voice, notes, i, stepTime, when) {
	var note = notes[idx(i + 1)]
	if ( LuaTrue( note ) && LuaTrue( note>0 ) ) {
		note -= 1
		var octave = notes[idx(i + 2)]
		var hold = notes[idx(i + 3)]
		
		var freqIdx = 1 + (octave * 12) + note + 1
		var pitch = Frequency[idx(freqIdx)]
		var dur = hold * stepTime

		playNote(voice, pitch, dur, when)
	}
}

var updateAudio = function() {
	var now = audioTime()
	for (var i=1; i<=6; i+=1) {
		var isSong = i===1
		var stream = streams[idx(i)]
		if ( LuaTrue( stream.id===-1 ) ) { continue }
		
		var source = isSong && data.songs[idx(stream.id + 1)] || data.sounds[idx(stream.id + 1)]
		
		if ( LuaTrue( stream.startTime===-1 ) ) {
			stream.startTime = audioTime()
		}
		
		var offsetTime = stream.startTime + stream.shiftTime
		var now = audioTime() - offsetTime
		var last = (stream.tick-1) * stream.stepTime
		
		if ( LuaTrue( now<last ) ) { continue }
		
		var start = 0
		if ( LuaTrue( isSong ) ) {
			var loopTicks = source.ticks - source.loopFrom
			var rep = 0
			if ( LuaTrue( stream.tick>=source.ticks ) ) {
				rep += math.floor((stream.tick - stream.loopFrom) / loopTicks)
			}
			start = rep * loopTicks
		}
		var tock = stream.tick - start
		var when = stream.tick * stream.stepTime
		
		when += offsetTime
		
		var j = tock * 3
		if ( LuaTrue( isSong ) ) {
			for (var k=1; k<=voices.length; k+=1) {
				scheduleNote(voices[idx(k)], source.notes[idx(k)], j, stream.stepTime, when)
			}
		} else {
			scheduleNote(source.voice, source.notes, j, stream.stepTime, when)
		}
		
		stream.tick += 1
		tock += 1
		if ( LuaTrue( tock>=source.ticks ) ) {
			if ( LuaTrue( isSong ) ) {
				if ( LuaTrue( stream.loop ) ) {
					stream.loopFrom = source.loopFrom
				} else {
					stream.id = -1
					if ( LuaTrue( stream.callback ) ) {
						stream.callback()
					}
				}
			} else {
				stream.id = -1
			}
		}
		
		
	}
}
var textMeta = {}
function drawText(text, tx,ty, maxChars) { // no line returns!
	if ( LuaTrue( maxChars ) && LuaTrue( maxChars<0 ) ) {
		tx += maxChars
		maxChars *= -1
	}
	
	var len = text.length 
	if ( LuaTrue( maxChars ) && LuaTrue( maxChars < len ) ) {
		len = maxChars
	}
	var chars = 0
	var offsets = 0
	var ox = tx * tileWidth
	var oy = ty * tileHeight
	for (var j=1; j<=len; j+=1) {
		var x = j-1
		var f = ascii(text,j)
		var frameId = null
		if ( LuaTrue( f>127 ) ) {
			var embedId = f - 127
			frameId = embeds[idx(embedId)]
		}
		f -= 31 // convert from ascii to 1-based charBitmaps index
		
		if ( LuaTrue( f<1 ) || LuaTrue( f>charBitmaps.length ) ) { 
			f = 1 // OoB just draw space
		}
		
		if ( LuaTrue( f===1 ) && LuaTrue( chars===0 ) && ! LuaTrue( frameId ) ) {
			offsets += 1
		} else if ( LuaTrue( f>1 ) || LuaTrue( chars>0 ) || LuaTrue( frameId ) ) {
			chars += 1
		}
		
		if ( LuaTrue( frameId ) ) {
			drawBitmap(frameBitmaps[idx(frameId)],ox+(x*charWidth),oy)
		} else {
			drawBitmap(charBitmaps[idx(f)],ox+(x*charWidth),oy)
		}
	}
	textMeta.chars = chars
	textMeta.offsets = offsets
	
	setDirtyRect(tx,ty,len*tileWidth/charWidth,1)
}

var sayAngle = 0
function say(text,callback,rect) {
	var message = doValue(text)
	if ( ! LuaTrue( message ) || LuaTrue( message.length===0 ) ) { return }
	
	sayAngle = 0
	
	var tmpLines = split(message, '\n')
	
	var x = 3
	var y = 3
	var w = 17 // tilesPerLine
	var h = 4 // linesPerPage
	
	// x,y,tilesPerLine,linesPerPage
	if ( LuaTrue( rect ) ) {
		x = rect.x
		y = rect.y
		w = LuaTrue(rect.w>0) ? rect.w : w
		h = LuaTrue(rect.h>0) ? rect.h : h
	}
	
	var maxCharTiles = roomTilesWide-2
	if ( LuaTrue( w>maxCharTiles ) ) {
		w = maxCharTiles
	}
	
	var maxLineTiles = roomTilesHigh-2
	if ( LuaTrue( h>maxLineTiles ) ) {
		h = maxLineTiles
	}
	
	var cols = w // charsPerLine
	var rows = h
	
	if ( LuaTrue( charWidth!==tileWidth ) ) { // half-width font
		cols *= 2
	}
	
	var lines = []
	for (var i=1; i<=tmpLines.length; i+=1) {
		var sublines = split(tmpLines[idx(i)], '\f')
		var subLineCount = sublines.length
		for (var j=1; j<=subLineCount; j+=1) {
			var line = sublines[idx(j)]
			while ( line.length>cols ) {// line is too long
				var char = substring(line,cols,cols)
				var nextChar = substring(line,cols+1,cols+1)
				var charPair = substring(line,cols,cols+1)
				var isSpace = nextChar===' '
				if ( LuaTrue( char==='-' ) || LuaTrue( match(charPair,'[.,?!][ \t\n]') ) || LuaTrue( isSpace ) ) { // natural wrapping point
					push(lines, substring(line,1,cols))
					line = substring(line,cols+1+(LuaTrue(isSpace) ? 1 : 0))
				} else { // look behind for whitespace
					if ( LuaTrue( match(substring(line,1,cols),'[ \t\n]') ) ) {
						var __line = line
						for (var k=cols-1; k>=1; k+=-1) {
							char = substring(line,k,k)
							nextChar = substring(line,k+1,k+1)
							charPair = substring(line,k,k+1)
							var isSpace = nextChar===' '
							if ( LuaTrue( char==='-' ) || LuaTrue( match(charPair,'[.,?!][ \t\n]') ) || LuaTrue( nextChar===' ' ) ) { // natural wrapping point
								push(lines, substring(line,1,k))
								line = substring(line,k+1+(LuaTrue(isSpace) ? 1 : 0))
								break
							}
						}
						
						if ( LuaTrue( line===__line ) ) {
							push(lines, substring(line,1,cols))
							line = substring(line,cols+1)
							
							if ( LuaTrue( line===__line ) ) {
								// we should never reach this point but...
								fatal('Unable to find suitable wrapping point')
							}
						}
					} else { // no whitespace, force hard wrap
						push(lines, substring(line,1,cols))
						line = substring(line,cols+1)
					}
				}
			}
			push(lines, line)
			if ( LuaTrue( subLineCount>1 ) && LuaTrue( j<subLineCount ) ) {
				// pad out to the next page
				while ( lines.length%textLines>0 ) {
					push(lines,'')
				}
			}
		}
	}
	
	// reset renderer
	TextRenderer.x = x
	TextRenderer.y = y
	TextRenderer.w = w // tiles
	TextRenderer.h = h // tiles
	TextRenderer.page = 1
	TextRenderer.line = 1
	TextRenderer.char = 1
	TextRenderer.wait = false
	TextRenderer.delay = 0
	TextRenderer.lines = lines.length
	TextRenderer.pages = math.ceil(lines.length / rows)
	
	ignoreDraw += 1
	var bitmaps = TextRenderer.bitmaps
	for (var i=1; i<=lines.length; i+=1) {
		if ( ! LuaTrue( bitmaps[idx(i)] ) ) {
			bitmaps[idx(i)] = newBitmap(maxCharTiles*tileWidth,tileHeight,Color.Clear)
		} else {
			clearBitmap(bitmaps[idx(i)])
		}
		pushContext(bitmaps[idx(i)])
		drawText(lines[idx(i)],0,0)
		TextRenderer.chars[idx(i)] = textMeta.chars
		TextRenderer.offsets[idx(i)] = textMeta.offsets
		popContext()
	}
	ignoreDraw -= 1
	
	if ( LuaTrue( callback ) ) {
		var event = getEvent()
		textCallback = function() {
			push(events, event)
			pushCall(callback)
			pop(events) 
			// dirtyRoom()
		}
	} else {
		textCallback = null
	}
}
function fin(text,rect) {
	hasEnded = true
	activeRoomId = null
	deferred = null
	say(text,null,rect)
	doEvent(newEvent('finish', data))
	saveStore()
}

var loadAudio = function() {
	// sounds
	soundsByName = {}
	if ( ! LuaTrue( data.sounds ) ) { data.sounds = {} }
	for (var i=1; i<=data.sounds.length; i+=1) {
		var sound = data.sounds[idx(i)];
		if ( ! LuaTrue( sound ) ) { continue }
		sound.voice = newVoice(sound.type, defaultEnvelope.attack,defaultEnvelope.decay,defaultEnvelope.sustain,defaultEnvelope.release,defaultEnvelope.volume)
		applyEnvelope(sound.voice, sound.envelope)
		soundsByName[idx(sound.name)] = sound
		
		
	}

	// songs
	songsByName = {}
	if ( ! LuaTrue( data.songs ) ) { data.songs = {} }
	for (var i=1; i<=data.songs.length; i+=1) {
		var song = data.songs[idx(i)];
		if ( ! LuaTrue( song ) ) { continue }
		songsByName[idx(song.name)] = song
		song.splits = null // unneeded
		
		
	}
}
var onDataReady = function() {
	cacheBitmaps()
	
	loadAudio()
	
	// flatten data.scripts to only the parts needed by the Lua runtime
	for (var i=1; i<=data.scripts.length; i+=1) {
		var script = data.scripts[idx(i)]
		if ( ! LuaTrue( script ) ) { continue }
		
		if ( LuaTrue( script.data ) && LuaTrue( script.data.__srcOrder.length>0 ) ) {
			script.data.__srcOrder = null
			script.data.__comments = null
			data.scripts[idx(i)] = script.data
		} else {
			data.scripts[idx(i)] = false
		}
		
		
	}
		
	// track scripts
	var targets = []
	var game = data
	if ( LuaTrue( game.script ) ) {
		push(targets, game)
		game.script = data.scripts[idx(game.script + 1)]
	}
	
	roomsByName = {}
	for (var i=1; i<=data.rooms.length; i+=1) {
		var room = data.rooms[idx(i)]
		if ( ! LuaTrue( room ) ) { continue }
		
		roomsByName[idx(room.name)] = room
		if ( LuaTrue( room.script ) ) {
			push(targets, room)
			room.script = data.scripts[idx(room.script + 1)]
		}
		
		
	}
	
	// setup timers
	tilesByName = {}
	for (var i=1; i<=data.tiles.length; i+=1) {
		var tile = data.tiles[idx(i)]
		if ( ! LuaTrue( tile ) ) { continue }
		
		tilesByName[idx(tile.name)] = tile
		tile.btype = null // editor-only
		if ( LuaTrue( tile.frames.length===1 ) ) {
			tile.onlyFrame = tile.frames[idx(1)]
		}
		
		var fps = tile.fps
		if ( LuaTrue( fps>0 ) ) {
			newFrameTimer(fps)
		}
		
		if ( LuaTrue( tile.script ) ) {
			push(targets, tile)
			tile.script = data.scripts[idx(tile.script + 1)]
		}
		
	}
	
	data.scripts = null
	
	if ( LuaTrue( data.song!==-1 ) ) {
		startSong(data.song) // can be overridden by games's script
	}
	
	// setup player object before we emit the load event
	player = {
		id : data.player.id,
		tile : data.tiles[idx(data.player.id + 1)],
		x : data.player.x,
		y : data.player.y,
	}
	
	for (var i=1; i<=targets.length; i+=1) {
		doEvent(newEvent('load', targets[idx(i)]))
	}
	targets = null
	
	doEvent(newEvent('start', data))

	var startRoom = data.player.room + 1
	if ( ! LuaTrue( hasStarted ) ) {
		setRoom(startRoom)
	}
}

function playerAct(tile, roomIndex) {
	if ( ! LuaTrue( tile ) ) {
		var x = player.x + lastDx
		var y = player.y + lastDy

		// bound to room
		if ( LuaTrue( x<0 ) ) { x = 0
		} else if ( LuaTrue( x>24 ) ) { x = 24 }
		if ( LuaTrue( y<0 ) ) { y = 0
		} else if ( LuaTrue( y>14 ) ) { y = 14 }

		roomIndex = (y * roomTilesWide + x) + 1
		var tileId = data.rooms[idx(activeRoomId)].tiles[idx(roomIndex)]
		tile = data.tiles[idx(tileId+1)]
	}

	var interacted = false
	if ( LuaTrue( tile.type===TileType.Item ) ) {
		doEvent(newEvent('collect', tile,roomIndex))
	} else if ( LuaTrue( tile.type===TileType.Sprite ) ) {
		interacted = true
		doEvent(newEvent('interact', tile,roomIndex))
	}
	return interacted
}

var playerMove = function(dx,dy) {

	if ( LuaTrue( hasEnded ) ) { return }
	
	var ox = player.x
	var oy = player.y
	var x = ox + dx
	var y = oy + dy

	// bound to room
	var bumped = false
	if ( LuaTrue( x<0 ) ) { 
		bumped = true
		x = 0
	} else if ( LuaTrue( x>24 ) ) { 
		bumped = true
		x = 24 
	}
	if ( LuaTrue( y<0 ) ) { 
		bumped = true
		y = 0
	} else if ( LuaTrue( y>14 ) ) { 
		bumped = true
		y = 14 
	}

	var i = (y * roomTilesWide + x) + 1

	// get the tile the player is attempting to move onto
	var tileId = data.rooms[idx(activeRoomId)].tiles[idx(i)]
	var tile = data.tiles[idx(tileId+1)]
	if ( ! LuaTrue( tile.solid ) ) { // move
		var h = (player.y * roomTilesWide + player.x) + 1
	
		player.x = x
		player.y = y
		
		// TODO: handle config.follow==1
		if ( LuaTrue( config.follow!==1 ) ) {
			drawnRoomFrames[idx(h)] = -1
			drawnRoomFrames[idx(i)] = -1
		}
	}

	var event = newEvent('update', player.tile,i)
	event.dx = dx
	event.dy = dy
	event.tx = x
	event.ty = y
	push(events, event)
	doEvent(event)
	
	if ( LuaTrue( hasEnded ) ) { return }

	lastDx = dx
	lastDy = dy
	var interacted = false
	if ( LuaTrue( config.autoAct===1 ) || LuaTrue( tile.type===TileType.Item ) ) {
		interacted = playerAct(tile, i)
	}

	var exitRoom,exitXY
	if ( LuaTrue( tile.type!==TileType.Sprite ) ) {
		var exits = data.rooms[idx(activeRoomId)].exits
		for (var i=1; i<=exits.length; i+=1) {
			var exit = exits[idx(i)]
			if ( LuaTrue( exit.edge ) ) {
				var exitVertical = false
				var exitHorizontal = false
				if ( LuaTrue( exit.y===oy ) ) {
					if ( LuaTrue( exit.edge===ExitEdge.North ) && LuaTrue( dy<0 ) ) {
						exitVertical = true
					} else if ( LuaTrue( exit.edge===ExitEdge.South ) && LuaTrue( dy>0 ) ) {
						exitVertical = true
					}
				}
				if ( LuaTrue( exit.x===ox ) ) {
					if ( LuaTrue( exit.edge===ExitEdge.West ) && LuaTrue( dx<0 ) ) {
						exitHorizontal = true
					} else if ( LuaTrue( exit.edge===ExitEdge.East ) && LuaTrue( dx>0 ) ) {
						exitHorizontal = true
					}
				}
				if ( LuaTrue( exitVertical ) ) {
					exitXY = function() {
						player.y = exit.ty
					}
					exitRoom = exit.room+1
					break
				} else if ( LuaTrue( exitHorizontal ) ) {
					exitXY = function() {
						player.x = exit.tx
					}
					exitRoom = exit.room+1
					break
				}
			} else if ( LuaTrue( exit.x===x ) && LuaTrue( exit.y===y ) ) {
				if ( LuaTrue( exit.fin ) ) {
					if ( LuaTrue( exit.song===-2 ) ) {
						stopSong()
					} else if ( LuaTrue( exit.song!==-1 ) ) {
						startSong(exit.song)
					}
					fin(exit.fin)
					break
				} else if ( LuaTrue( exit.room!==-1 ) && LuaTrue( exit.tx!==-1 ) && LuaTrue( exit.ty!==-1 ) ) {
					exitXY = function() {
						player.x = exit.tx
						player.y = exit.ty
					}
					exitRoom = exit.room+1
					break
				}
			}
		}
	}

	if ( LuaTrue( (tile.solid ) || LuaTrue( bumped) ) && ! LuaTrue( interacted ) && ! LuaTrue( exitRoom ) ) {
		doEvent(newEvent('bump'))
	} else {
		isPlayerDirty = true
	}

	pop(events)  // player's update event

	if ( LuaTrue( exitRoom ) ) {
		setRoom(exitRoom, exitXY)
	}
}

var buttonPressed = function(which) {
	var x = player.x + lastDx
	var y = player.y + lastDy
	// bound to room
	if ( LuaTrue( x<0 ) ) { x = 0
	} else if ( LuaTrue( x>24 ) ) { x = 24 }
	if ( LuaTrue( y<0 ) ) { y = 0
	} else if ( LuaTrue( y>14 ) ) { y = 14 }

	var i = (player.y * roomTilesWide + player.x) + 1
	var event = newEvent(which, player.tile,i)
	event.dx = lastDx
	event.dy = lastDy
	event.tx = x
	event.ty = y
	doEvent(event)
}
var cranked = function() {
	var i = (player.y * roomTilesWide + player.x) + 1
	doEvent(newEvent('crank', player.tile,i))
}
var undockedCrank = function() {
	var i = (player.y * roomTilesWide + player.x) + 1
	doEvent(newEvent('undock', player.tile,i))
}
var dockedCrank = function() {
	var i = (player.y * roomTilesWide + player.x) + 1
	doEvent(newEvent('dock', player.tile,i))	
}

var initAudio = function() {
	for (var i=1; i<=streams.length; i+=1) {
		streams[idx(i)].id = -1
	}
	for (var i=1; i<=voices.length; i+=1) {
		setVolume(voices[idx(i)], 1)
	}
}
var init = function() {
	// init vars
	data = null
	activeRoomId = null
	
	// charWidth = tileWidth
	// textChars = 17

	player = null
	isDrawing = false
	isShaking = false
	acceptsInput = true
	inputStack = 0
	hasStarted = false
	hasEnded = false

	// frameBitmaps = list {}
	// arrowBitmaps = list {}
	// charBitmaps = list {}

	textCallback = null

	nextFreeTimerIndex = 1
	waitTimers = []
	playTimers = []
	playTimersByRoomIndex = []
	frameTimers = []

	roomFrames = []

	events = []
	menus = []
	embeds = []
	embedsByName = {}
	vars = {}
	store = {}
	modifiedStore = false
	
	nextFreeDeferredIndex = 1
	deferred = []
	lastDx = 0
	lastDy = 0
	cropRect = {x:0,y:0,w:roomTilesWide,h:roomTilesHigh}
	
	initAudio()
}
var reload = function() {
	init()
	loadData(onDataReady)
}
var update = function() {
	runningFrame += 1
	
	updateAudio()
	
	var menuCount = menus.length
	if ( LuaTrue( menuCount>0 ) ) {
		var menu = menus[idx(menuCount)]
		var page = math.floor((menu.selected-1) / menu.pageRows) // 0-based
		var pageTop = (page * menu.pageRows) + 1
		var pageBottom = pageTop + menu.pageRows - 1
		var selected = menu.selected

		var menuDir = 0
		menuAngle += crankState.relative
		if ( LuaTrue( menuAngle>=90 ) ) {
			menuDir = 1
			menuAngle -= 90
		} else if ( LuaTrue( menuAngle<=-90 ) ) {
			menuDir = -1
			menuAngle += 90
		}

		if ( LuaTrue( justPressed(Button.UP) ) || LuaTrue( menuDir<0 ) ) {
			menu.selected -= 1
			if ( LuaTrue( menu.selected<pageTop ) ) {
				menu.selected += menu.pageRows 
			}
		} else if ( LuaTrue( justPressed(Button.DOWN) ) || LuaTrue( menuDir>0 ) ) {
			menu.selected += 1
			if ( LuaTrue( menu.selected>menu.count ) ) {
				menu.selected = pageTop
			} else if ( LuaTrue( menu.selected>pageBottom ) ) {
				menu.selected -= menu.pageRows 
			}
		} else if ( LuaTrue( justPressed(Button.LEFT) ) ) {
			menu.selected -= menu.pageRows
			if ( LuaTrue( menu.selected<1 ) ) {
				menu.selected += menu.pages*menu.pageRows
			}
		} else if ( LuaTrue( justPressed(Button.RIGHT) ) ) {
			menu.selected += menu.pageRows
			if ( LuaTrue( menu.selected>menu.pages*menu.pageRows ) ) {
				menu.selected -= menu.pages*menu.pageRows
			}
		}
		
		if ( LuaTrue( menu.selected>menu.count ) ) {
			menu.selected = menu.count
		}
		
		if ( LuaTrue( selected!==menu.selected ) ) {
			var event = newEvent('change', data)
			event.option = menu.options[idx(menu.selected)]
			doEvent(event)
		}
		
		if ( LuaTrue( justPressed(Button.A) ) ) {
			if ( LuaTrue( TextRenderer.ask ) ) {
				if ( LuaTrue( menu.selected<=menu.count ) ) {
					// close text window
					TextRenderer.lines = 0
					TextRenderer.ask = false
				}
			}
			if ( LuaTrue( menu.selected<=menu.count ) ) {
				var event = newEvent('select', data)
				event.option = menu.options[idx(menu.selected)]
				doEvent(event)
				menu.callback()
				if ( LuaTrue( menus.length===menuCount ) ) {
					while ( menus.length>0 ) {
						pop(menus)
					}
				}
			} else {
				doEvent(newEvent('invalid', data))
			}
		} else if ( LuaTrue( justPressed(Button.B) ) ) {
			if ( LuaTrue( menuCount>1 ) || LuaTrue( config.allowDismissRootMenu===1 ) ) {
				doEvent(newEvent('dismiss', data))
				pop(menus)
				// dirtyRoom()
			} else {
				doEvent(newEvent('invalid', data))
			}
		}
		return
	}

	if ( LuaTrue( TextRenderer.lines>0 ) ) {
		if ( LuaTrue( TextRenderer.wait ) ) {
			TextRenderer.elapsed += frameDuration
			if ( LuaTrue( TextRenderer.elapsed>=TextRenderer.duration ) ) {
				TextRenderer.elapsed -= TextRenderer.duration
				TextRenderer.flash = ! TextRenderer.flash
			}
		}
		
		TextRenderer.delay += frameDuration
		if ( LuaTrue( TextRenderer.delay>=config.sayAdvanceDelay ) ) {
			
			sayAngle += crankState.relative
			var halfCrank = false
			if ( LuaTrue( sayAngle>180 ) ) {
				halfCrank = true
				sayAngle -= 180
			} else if ( LuaTrue( sayAngle<-180 ) ) {
				halfCrank = true
				sayAngle += 180
			}
		
			if ( LuaTrue( justPressed(Button.ANY) ) || LuaTrue( halfCrank ) ) {
				if ( LuaTrue( TextRenderer.wait ) ) {
					if ( LuaTrue( TextRenderer.page<TextRenderer.pages ) ) {
						TextRenderer.page += 1
						TextRenderer.line = 1
						TextRenderer.char = 1
						TextRenderer.wait = false
						TextRenderer.delay = 0
						TextRenderer.elapsed = 0
						TextRenderer.flash = false
					} else {
						if ( ! LuaTrue( TextRenderer.ask ) ) {
							TextRenderer.lines = 0
						}
						if ( LuaTrue( textCallback ) ) {
							textCallback()
							// textCallback = nil
						} else if ( LuaTrue( hasEnded ) ) {
							// buh
							reload()
						}
					}
				} else {
					if ( LuaTrue( config.textSkip === 1 ) ) {
						var pageStart = (TextRenderer.page-1) * TextRenderer.h
						var pageLength = math.min(pageStart + TextRenderer.h, TextRenderer.lines) - pageStart
						TextRenderer.line = pageLength
						TextRenderer.char = TextRenderer.chars[idx(pageStart + TextRenderer.line)]
						waitForInput()
					}
				}
			}
		}
		return
	}

	if ( LuaTrue( hasEnded ) ) { return }
	
	if ( LuaTrue( activeRoomId ) ) {
		doEvent(newEvent('loop', data))
		if ( LuaTrue( hasEnded ) ) { return }
	}

	nextFreeDeferredIndex = deferred.length
	for (var i=deferred.length; i>=1; i+=-1) {
		var func = deferred[idx(i)]
		if ( ! LuaTrue( func ) ) {
			nextFreeDeferredIndex = i
			continue
		}
		func()
		deferred[idx(i)] = false
		
	}
	
	if ( LuaTrue( hasEnded ) ) { return }
	
	if ( LuaTrue( acceptsInput ) ) {
		if ( LuaTrue( justRepeated(Button.UP) ) ) {
			playerMove(0,-1)
		} else if ( LuaTrue( justRepeated(Button.DOWN) ) ) {
			playerMove(0,1)
		} else if ( LuaTrue( justRepeated(Button.LEFT) ) ) {
			playerMove(-1,0)
		} else if ( LuaTrue( justRepeated(Button.RIGHT) ) ) {
			playerMove(1,0)
		}
	
		if ( LuaTrue( justPressed(Button.A) ) ) {
			buttonPressed('confirm')
		}
		if ( LuaTrue( justPressed(Button.B) ) ) {
			buttonPressed('cancel')
		}
		
		if ( LuaTrue( crankWasDocked!==crankState.docked ) ) {
			if ( LuaTrue( crankWasDocked ) ) {
				undockedCrank()
			} else {
				dockedCrank()
			}
		}
		
		if ( LuaTrue( crankState.relative!==0 ) ) {
			cranked()
		}
	}

	if ( LuaTrue( hasEnded ) ) { return }
	
	for (var i=playTimers.length; i>=1; i+=-1) {
		var timer = playTimers[idx(i)]
		if ( ! LuaTrue( timer ) ) { continue }
	
		timer.elapsed += frameDuration
		if ( LuaTrue( timer.elapsed>=timer.duration ) ) {
			timer.elapsed -= timer.duration
			timer.frame += 1
			if ( LuaTrue( timer.frame<=timer.frames ) ) {
				if ( LuaTrue( timer.roomIndex===playerIndex ) ) {
					player.frame = timer.frame
				} else {
					roomFrames[idx(timer.roomIndex)] = timer.frame
				}
			} else {
				clearPlayTimer(timer.roomIndex)
				if ( LuaTrue( timer.callback ) ) {
					timer.callback()
				}
			}
		}
		
	}

	nextFreeTimerIndex = waitTimers.length+1
	for (var i=waitTimers.length; i>=1; i+=-1) {
		var timer = waitTimers[idx(i)]
		if ( ! LuaTrue( timer ) ) {
			nextFreeTimerIndex = i
			continue
		}
		
		timer.elapsed += frameDuration
		if ( LuaTrue( timer.elapsed>=timer.duration ) ) {
			waitTimers[idx(i)] = false
			timer.callback()
		}
		
	}

	for (var fps in frameTimers) { var timer = frameTimers[fps]; // NOTE: fps may be a float or less than 1!
		timer.elapsed += frameDuration
		if ( LuaTrue( timer.elapsed>=timer.duration ) ) {
			timer.elapsed -= timer.duration
			timer.frame += 1
		}
	}
	
	if ( LuaTrue( isShaking ) ) {
		offset(random(0,4)-2,random(0,4)-2)
	}
}
function drawRect(color, x,y,width,height) {
	if ( LuaTrue( color==="white" ) ) {
		color = Color.White
	} else {
		color = Color.Black
	}
	
	if ( LuaTrue( width<0 ) ) {
		x += width
		width *= -1
	}
	
	if ( LuaTrue( height<0 ) ) {
		y += height
		height *= -1
	}
	
	setColor(color)
	fillRect(x,y,width,height)
	
	var x1 = math.floor(x/tileWidth)
	var x2 = math.ceil((x+width)/tileWidth)
	var y1 = math.floor(y/tileHeight)
	var y2 = math.ceil((y+height)/tileHeight)
	setDirtyRect(x1, y1, x2-x1,y2-y1)
}

function drawWindow(tileX, tileY, tilesWide, tilesHigh) {
	if ( LuaTrue( tilesWide<0 ) ) {
		tileX += tilesWide
		tilesWide *= -1
	}
	if ( LuaTrue( tilesHigh<0 ) ) {
		tileY += tilesHigh
		tilesHigh *= -1
	}
	
	var bitmap = windowBitmaps[idx(tilesWide * 100 + tilesHigh)]
	if ( ! LuaTrue( bitmap ) ) {
		// print('caching window bitmap', tilesWide, tilesHigh)
		bitmap = newBitmap(tilesWide*tileWidth,tilesHigh*tileHeight,Color.White)
		ignoreDraw += 1
		pushContext(bitmap)
		var x1 = 0
		var y1 = 0
		var innerWidth = (tilesWide-2) * tileWidth
		var innerHeight = (tilesHigh-2) * tileHeight
		var x2 = x1+tileWidth
		var y2 = y1+tileHeight
		var x3 = x2+innerWidth
		var y3 = y2+innerHeight
	
		drawBitmap(pipeBitmaps[idx(1)], x1, y1)
		tileBitmap(pipeBitmaps[idx(2)], x2, y1, innerWidth, tileHeight)
		drawBitmap(pipeBitmaps[idx(3)], x3, y1)

		tileBitmap(pipeBitmaps[idx(4)], x1, y2, tileWidth,innerHeight)
		tileBitmap(pipeBitmaps[idx(5)], x2, y2, innerWidth, innerHeight)
		tileBitmap(pipeBitmaps[idx(6)], x3, y2, tileWidth, innerHeight)

		drawBitmap(pipeBitmaps[idx(7)], x1, y3)
		tileBitmap(pipeBitmaps[idx(8)], x2, y3, innerWidth, tileHeight)
		drawBitmap(pipeBitmaps[idx(9)], x3, y3)
		popContext()
		ignoreDraw -= 1
		
		windowBitmaps[idx(tilesWide * 100 + tilesHigh)] = bitmap
	}
	drawBitmap(bitmap, tileX*tileWidth, tileY*tileHeight)
	setDirtyRect(tileX, tileY, tilesWide,tilesHigh)
}
var render = function() {
	if ( LuaTrue( isVisualDebug ) ) {
		for (var i=1; i<=roomTilesWide*roomTilesHigh; i+=1) {
			dirtyRoomFrames[idx(i)] = false
		}
	}
	
	isDrawing = true
	var drawText = TextRenderer.lines>0
	if ( LuaTrue( activeRoomId ) ) {
		var roomTiles = data.rooms[idx(activeRoomId)].tiles
		var dataTiles = data.tiles
		var ox = 0
		var oy = 0
		var px = player.x
		var py = player.y
		var followPlayer = config.follow===1
		var blackFrame = 1
		var overflowFrame = blackFrame
		
		var cx1 = cropRect.x + 1
		var cy1 = cropRect.y + 1
		var cx2 = cx1 + cropRect.w - 1
		var cy2 = cy1 + cropRect.h - 1
		
		if ( LuaTrue( followPlayer ) ) {
			ox = config.followCenterX - px
			oy = config.followCenterY - py
			var overflowTile = getTile(config.followOverflowTile)
			if ( LuaTrue( overflowTile ) ) {
				overflowFrame = LuaTrue(overflowTile.onlyFrame) ? overflowTile.onlyFrame : getFrame(overflowTile)
			}
		}
		
		for (var y=1; y<=roomTilesHigh; y+=1) {
			for (var x=1; x<=roomTilesWide; x+=1) {
				var i = (y-1) * roomTilesWide + x
				
				// cropped
				if ( LuaTrue( y<cy1 ) || LuaTrue( y>cy2 ) || LuaTrue( x<cx1 ) || LuaTrue( x>cx2 ) ) {
					if ( LuaTrue( blackFrame===drawnRoomFrames[idx(i)] ) ) {
						continue
					}
					drawnRoomFrames[idx(i)] = blackFrame
					dirtyRoomFrames[idx(i)] = true
					drawBitmap(frameBitmaps[idx(blackFrame+1)],(x-1)*tileWidth,(y-1)*tileHeight)
					continue
				}
				
				if ( LuaTrue( followPlayer ) ) {
					// outside room bounds
					if ( LuaTrue( y-oy<=0 ) || LuaTrue( y-oy>roomTilesHigh ) || LuaTrue( x-ox<=0 ) || LuaTrue( x-ox>roomTilesWide ) ) {
						if ( LuaTrue( overflowFrame===drawnRoomFrames[idx(i)] ) ) {
							continue
						}
						drawnRoomFrames[idx(i)] = overflowFrame
						dirtyRoomFrames[idx(i)] = true
						drawBitmap(frameBitmaps[idx(overflowFrame+1)],(x-1)*tileWidth,(y-1)*tileHeight)
						continue
					}
				}

				var oi = (y-oy-1) * roomTilesWide + x - ox
				var tileId = roomTiles[idx(oi)]
				var tile = dataTiles[idx(tileId+1)]
				var frame = LuaTrue(tile.onlyFrame) ? tile.onlyFrame : getFrame(tile,oi)
				
				if ( LuaTrue( frame===drawnRoomFrames[idx(i)] ) ) {
					continue
				}

				drawnRoomFrames[idx(i)] = frame
				dirtyRoomFrames[idx(i)] = true
				drawBitmap(frameBitmaps[idx(frame+1)],(x-1)*tileWidth,(y-1)*tileHeight)
			
				
			}
		}
		
		var i = (py * roomTilesWide + px) + 1
		doEvent(newEvent('draw', player.tile,i))
		// could px,py have changed during draw?
		// px = player.x
		// py = player.y
		var oi = ((py+oy) * roomTilesWide + (px+ox)) + 1
		if ( ! LuaTrue( hidePlayer ) ) {
			var tile = dataTiles[idx(player.id+1)]
			var frame = LuaTrue(tile.onlyFrame) ? tile.onlyFrame : getFrame(tile)
			if ( LuaTrue( frame!==drawnRoomFrames[idx(oi)] ) ) {
				drawnRoomFrames[idx(oi)] = frame
				dirtyRoomFrames[idx(oi)] = true
				drawBitmap(frameBitmaps[idx(frame+1)],(ox+px)*tileWidth,(oy+py)*tileHeight)
			}
		}
	} else {
		clearContext()
	}

	if ( LuaTrue( drawText ) ) {
		drawWindow(TextRenderer.x,TextRenderer.y,TextRenderer.w+2,TextRenderer.h+2)
	
		if ( LuaTrue( TextRenderer.wait ) ) {
			var i = LuaTrue(TextRenderer.flash) ? 2 : 1
			drawBitmap(arrowBitmaps[idx(i)],(TextRenderer.x+TextRenderer.w)*tileWidth,(TextRenderer.y+TextRenderer.h+1)*tileHeight)
		}
	
		var bitmaps = TextRenderer.bitmaps
	
		var pageStart = (TextRenderer.page-1) * TextRenderer.h
		var pageLength = math.min(pageStart + TextRenderer.h, TextRenderer.lines) - pageStart
		var ox = (TextRenderer.x+1)*tileWidth
		var oy = (TextRenderer.y+1)*tileHeight
		for (var i=1; i<=TextRenderer.h; i+=1) {
			var j = i + pageStart
			if ( LuaTrue( j>TextRenderer.lines ) ) { break }
			if ( LuaTrue( i>TextRenderer.line ) ) { break }
		
			var y = (i-1)*tileHeight
			if ( LuaTrue( i===TextRenderer.line ) ) {
				var char = math.floor(TextRenderer.char)
				setClipRect(ox+TextRenderer.offsets[idx(j)]*charWidth,oy+y,charWidth*char,tileHeight)
			}
			drawBitmap(bitmaps[idx(j)],ox,oy+y)
		}
		clearClipRect()
	
		if ( ! LuaTrue( TextRenderer.wait ) ) {
			TextRenderer.char += config.textSpeed / 20.0
			if ( LuaTrue( TextRenderer.char>=TextRenderer.chars[idx(pageStart+TextRenderer.line)] ) ) {
				if ( LuaTrue( TextRenderer.line>=pageLength ) ) {
					waitForInput()
				} else {
					TextRenderer.char = 1
					TextRenderer.line += 1
				}
			}
		}
	}
	
	for (var i=1; i<=menus.length; i+=1) {
		var menu = menus[idx(i)]
		drawBitmap(menu.window,menu.x*tileWidth,menu.y*tileHeight)
		setDirtyRect(menu.x,menu.y,menu.w,menu.h)
		
		var page = math.floor((menu.selected-1) / menu.pageRows)
		if ( LuaTrue( menu.pages>1 ) ) {
			setClipRect((menu.x+2)*tileWidth,(menu.y+1)*tileHeight, menu.pageCols*tileWidth,menu.pageRows*tileHeight)
		}
		drawBitmap(menu.text,((menu.x + 2)-(menu.pageCols * page))*tileWidth,(menu.y+1)*tileHeight)
		if ( LuaTrue( menu.pages>1 ) ) {
			clearClipRect()
		}
		var arrow = 3
		if ( LuaTrue( i<menus.length ) ) {
			arrow = 4
		}
		drawBitmap(arrowBitmaps[idx(arrow)],(menu.x+1)*tileWidth,(menu.y+(((menu.selected-1) % menu.pageRows)+1))*tileHeight)
		if ( LuaTrue( menu.count>menu.pageRows ) ) {
			drawBitmap(arrowBitmaps[idx(5)],(menu.x+menu.pageCols)*tileWidth,(menu.y+menu.pageRows+1)*tileHeight)
		}
	}

	isDrawing = false
	hidePlayer = false
	isPlayerDirty = false
	datetime = null
}
var debug = function() {
	if ( ! LuaTrue( activeRoomId ) ) { return }
	
	var roomTiles = data.rooms[idx(activeRoomId)].tiles
	for (var y=1; y<=roomTilesHigh; y+=1) {
		for (var x=1; x<=roomTilesWide; x+=1) {
			var i = (y-1) * roomTilesWide + x
			// local tileId = roomTiles[i]
			// local tile = data.tiles[tileId+1]
			// if not tile then goto continue end
			// if tile.solid then
			if ( LuaTrue( dirtyRoomFrames[idx(i)] ) ) { // TODO: tmp swap
				fillRect((x-1)*tileWidth,(y-1)*tileHeight,tileWidth,tileHeight)
			}
			
		}
	}
}


