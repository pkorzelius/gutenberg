/**
 * External dependencies
 */
import {
	Gesture,
	GestureDetector,
	LongPressGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
	useSharedValue,
	runOnJS,
	useAnimatedReaction,
	useAnimatedGestureHandler,
} from 'react-native-reanimated';

/**
 * WordPress dependencies
 */
import {
	createContext,
	useContext,
	useRef,
	useMemo,
	Platform,
} from '@wordpress/element';

/**
 * Internal dependencies
 */
import styles from './style.scss';

const Context = createContext( {} );
const { Provider } = Context;
const DEFAULT_LONG_PRESS_MIN_DURATION = 500;
const DEFAULT_IOS_LONG_PRESS_MIN_DURATION =
	DEFAULT_LONG_PRESS_MIN_DURATION - 50;

/**
 * Draggable component.
 *
 * @param {Object}      props               Component props.
 * @param {JSX.Element} props.children      Children to be rendered.
 * @param {Function}    [props.onDragEnd]   Callback when dragging ends.
 * @param {Function}    [props.onDragOver]  Callback when dragging happens over an element.
 * @param {Function}    [props.onDragStart] Callback when dragging starts.
 * @param {string}      [props.testID]      Id used for querying the pan gesture in tests.
 *
 * @return {JSX.Element} The component to be rendered.
 */
const Draggable = ( {
	children,
	onDragEnd,
	onDragOver,
	onDragStart,
	testID,
} ) => {
	const isDragging = useSharedValue( false );
	const isPanActive = useSharedValue( false );
	const draggingId = useSharedValue( '' );
	const panGestureRef = useRef();

	const initialPosition = useRef( {
		x: useSharedValue( 0 ),
		y: useSharedValue( 0 ),
	} );
	const lastPosition = useRef( {
		x: useSharedValue( 0 ),
		y: useSharedValue( 0 ),
	} );

	useAnimatedReaction(
		() => isDragging.value,
		( result, previous ) => {
			if ( result === previous || previous === null ) {
				return;
			}

			if ( result ) {
				if ( onDragStart ) {
					onDragStart( {
						x: initialPosition.current.x.value,
						y: initialPosition.current.y.value,
						id: draggingId.value,
					} );
				}
			} else if ( onDragEnd ) {
				onDragEnd( {
					x: lastPosition.current.x.value,
					y: lastPosition.current.y.value,
					id: draggingId.value,
				} );
			}
		},
		[ initialPosition, lastPosition, draggingId, onDragStart, onDragEnd ]
	);

	const minDuration = useMemo( () => {
		return Platform.select( {
			ios: DEFAULT_IOS_LONG_PRESS_MIN_DURATION,
			android: DEFAULT_LONG_PRESS_MIN_DURATION,
		} );
	}, [
		DEFAULT_IOS_LONG_PRESS_MIN_DURATION,
		DEFAULT_LONG_PRESS_MIN_DURATION,
	] );

	const panGesture = useMemo( () => {
		return Gesture.Pan()
			.activateAfterLongPress( minDuration )
			.onStart( ( event ) => {
				const { x = 0, y = 0 } = event;

				initialPosition.current.x.value = x;
				initialPosition.current.y.value = y;
				isPanActive.value = true;
			} )
			.onUpdate( ( event ) => {
				const { x = 0, y = 0 } = event;

				lastPosition.current.x.value = x;
				lastPosition.current.y.value = y;

				if ( onDragOver ) {
					onDragOver( { x, y } );
				}
			} )

			.onEnd( () => {
				isPanActive.value = false;
				isDragging.value = false;
			} )
			.withRef( panGestureRef )
			.shouldCancelWhenOutside( false )
			.withTestId( testID );
	}, [
		initialPosition,
		isPanActive,
		lastPosition,
		onDragOver,
		isDragging,
		panGestureRef,
		testID,
		minDuration,
	] );

	const providerValue = useMemo( () => {
		return { panGestureRef, isDragging, isPanActive, draggingId };
	}, [
		// `isDragging`, `isPanActive` and `draggingId` are created using the
		// `useSharedValue` hook provided by the `react-native-reanimated`, which in
		// theory should guarantee that the value of these variables remains stable.
		// ESLint can't pick this up, and that's why they have to be specified as
		// dependencies for this hook call.
		isDragging,
		isPanActive,
		draggingId,
	] );

	return (
		<GestureDetector gesture={ panGesture }>
			<Animated.View style={ styles.draggable__container }>
				<Provider value={ providerValue }>{ children }</Provider>
			</Animated.View>
		</GestureDetector>
	);
};

/**
 * Draggable trigger component.
 *
 * This component acts as the trigger for the dragging functionality.
 *
 * @param {Object}      props                  Component props.
 * @param {JSX.Element} props.children         Children to be rendered.
 * @param {*}           props.id               Identifier passed within the event callbacks.
 * @param {boolean}     [props.enabled]        Enables the long-press gesture.
 * @param {number}      [props.maxDistance]    Maximum distance, that defines how far the finger is allowed to travel during a long press gesture.
 * @param {number}      [props.minDuration]    Minimum time, that a finger must remain pressed on the corresponding view.
 * @param {Function}    [props.onLongPress]    Callback when long-press gesture is triggered over an element.
 * @param {Function}    [props.onLongPressEnd] Callback when long-press gesture ends.
 * @param {string}      [props.testID]         Id used for querying the long-press gesture handler in tests.
 *
 * @return {JSX.Element} The component to be rendered.
 */
const DraggableTrigger = ( {
	children,
	enabled = true,
	id,
	maxDistance = 1000,
	minDuration = 500,
	onLongPress,
	onLongPressEnd,
	testID,
} ) => {
	const { panGestureRef, isDragging, isPanActive, draggingId } =
		useContext( Context );

	const gestureHandler = useAnimatedGestureHandler(
		{
			onActive: () => {
				if ( isDragging.value ) {
					return;
				}

				draggingId.value = id;
				isDragging.value = true;
				if ( onLongPress ) {
					runOnJS( onLongPress )( id );
				}
			},
			onEnd: () => {
				if ( ! isPanActive.value ) {
					isDragging.value = false;
				}

				if ( onLongPressEnd ) {
					runOnJS( onLongPressEnd )( id );
				}
			},
		},
		[ draggingId, isDragging, onLongPress, onLongPressEnd ]
	);

	return (
		<LongPressGestureHandler
			enabled={ enabled }
			minDurationMs={ minDuration }
			maxDist={ maxDistance }
			simultaneousHandlers={ panGestureRef }
			shouldCancelWhenOutside={ false }
			onGestureEvent={ gestureHandler }
			testID={ testID }
		>
			{ children }
		</LongPressGestureHandler>
	);
};

export { DraggableTrigger };
export default Draggable;
