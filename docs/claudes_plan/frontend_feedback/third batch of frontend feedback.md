
when there's no data and im on the stats screen, i dont want to see the "load sample data" there. that button should only be in the settings menu

for the phone modal: you dont have to create extra height if they dont make sense. like, the half height for the hints menu doesnt make sense, because that one should always be either full height or completele closed. and full height for the answer input also doesnt make sense, because it needs a giant empty space. so just make every model either open or closed (and if it cant be closed like the answer modal, make it open or lowered)
- also, when for example the answer modal is open and i drag it even higher (against its will), the modal cuts off at the bottom and shows the page underneath. so all modals should be the height of the device, regardless of how hight they are, so you can never see past the bottom.
- right now only the center part of the top of the modal is draggable, but i want that hitbox to be the full width of the modal.

untill now i've been viewing the app directly inside the chrome browser on my phone and tablet, because i cant "download" it yet. using the "install" option in the options menu in chrome just creates a shortcut to the website and still opens chrome. but i want to have it be a fullscreen web app.

on mobile, i cant see the question when i'm focussed on the answer input. repeat the question above that input.

i shouldnt be able to submit an answer when the input is empty.

the settings page scrollable part is in the center of the page, but that means i cant scroll on tablet unless i reach all the way to the center of the screen and scroll there. 

if a question is too long, it overflows to the right of the element, all the way off-screen. make that scrollable in the x direction when the question gets too long.
- wait, after testing this again it now wraps to the next line? i dont know what the difference was between the previous one that would overflow and this one, but i just want them to scroll in the x direction. that'll solve both ways.

after letting go when drawing a line, the line get's pixelated. i'd like it to be sharp like how it is while it's being drawn

when there are multiple toasts, they get drawn next to each other. i want there to be just 1. and when a second one is activated, the previous one should immediately go away and after it's gone the second one should show (so they dont interfere with each other's placement)
- for example when i'm spamming the canvas with 2 and 3 and 2 and 3 and .... i see the toasts pop up left and right and center and all over the bottom of the screen

im giving in. in the right menu on tablet, when it get's too high (for example when there are multiple inputs, or or when the "not right" element is shown (which has the option to see all steps which is quite long but nice)), all elements below the question box should be able to scroll
- at the moment the "rules this used" section is already scrollable, but that should just become part of the parent section which will be scrollable

when i have the latex in canvas option, tapping away to lose the focus of an element only works using stylus, not with my finger finger. the same goes for tapping on empty space to create an empty element, which only works with the stylus. i want these things to also work with my finger, given that i'll most likely be using my fingers when i have it in the latex typing mode...

another bug in the animation of the notation row selection in the settings page: the elements arriving animation is correct and very nice!, but the leaving animation has something weird, because it plays at the bottom of my screen instead of at the height of the actual element... idk what's going on there

this is something i'm not sure if you can fix but: both the mobile and tablet keyboards (both the default samsung keyboard) show an extra bar above them with the option to auto-fill a password/payment/location. this is taking up valuable space, and i was wondering if you could disencourage this by changing something like type or some attribute of the html input?

i think the chapters element (the one on the homescreen with the 9 togglable chapters) is slightly scrollable in the x direction? idk, but sometimes it looks like the horizontal scroll bar shows up for like 1 frame as if its possible to scroll it 1 pixel (or maybe even less) horizontally or something?

i currently have a question on the tablet that's \frac{x^2-16}{x+4}, but below that (still within the question box) there's the text "x \neq -4." ??? which isnt only not-styled, but i also feel like it kinda gives some information away about the answer, which would be a mistake that i would otherwise encounter myself and learn from.

the points in the endless mode only fill up to 10, and after that they dont update anymore. i'd like consqeuent answers to fill in from the right, and the whole line to move one left (so the most left point goes away). this could even have it's own little animation of the new point (green or red) appearing on the right, and then like a ripple do all the points move to the left, and the left most one fading out... or something like that