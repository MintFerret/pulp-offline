/**
 * Creates a little pubsub so that "plugins" can listen to Pulp stuff.
 */

const pubsub = (() => {
    const events = {};
    let subscriberID = 0;
    function publish(event, data) {
        if (!events[event]) {
            return;
        }
        events[event].forEach(function (subscriber) {
            subscriber.handler(event, data);
        });
    }

    function subscribe(event, handler) {
        if (!events[event]) {
            events[event] = [];
        }
        const id = subscriberID++;
        events[event].push({ handler, id });
        return id;
    }

    function unsubscribe(handlerID) {
        Object.keys(events).forEach((eventName) => {
            events[eventName].forEach(({ handler, id }, i) => {
                if (id == handlerID) {
                    events[eventName].splice(i, 1);
                    return;
                }
            });
        });
    }

    return {
        publish,
        subscribe,
        unsubscribe,
    };
})();
