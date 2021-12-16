grammar States

entry StateMachine:
    'statemachine' name=ID
    (states+=State | events+=Event)*;

State:
    'state' name=ID transitions+=Transition*;

Event: 
    'event' name=ID;

Transition:
    event=[Event] '=>' state=[State];

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
