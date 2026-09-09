oooh, i see you implemented the notation bar reordering in the actual bar, but i want this functionality in the settings screen. so remove it from the /practice page and add it to the /settings page

"copy for ai" button should be full width, just like the other components in that dropdown

the testdataset button should only show on dev environment, not on the docker one. (although, the button doesn't seem to work anymore anyway)

the notation bar in the latex input stops scrolling after letting go, but i want it to have a bit of inertia

Make sure to keep track of versions. i've updated the static text on the settings page to 0.1.9 manually (because we've had 9 feedback iterations, and by changing it i can verify that i'm looking at the latest version which wasnt the case more times than i'd like to admit (though now i have that handy update-popup!)), but i also see some other "0.1.0" hits when i do a codebase search for it.

On mobile the top bar is the right color, but the bottom bar is like blue-ish gray/black? it's not a color that appears elsewhere in the app it seems. And on tablet the top bar is i think a very light version of the background color (like, light brown)? and the bottom bar is just oled black
- a questions to answer in this chat: how hard would it be to add a harness to fix this issue with the task bars, and to add support for the pen button (i do really miss that)? and at the least give me a short prompt for in another chat to make a prototype of that wrapper for the webapp with the same technologys as this one so i can test if it's actually POSSIBLE to get that pen button state, and to have the android bars behaving like i want to in the app mode.

The horizontal scrollable toolbar on mobile cuts off too early. i want it to go all the way to the borders of the parent container (and to be clear it should then get some padding so when it's scrolled all the way to one side, then it should look the same as it does now). (also, on the non-fullscreen mode when there are stationary buttons to the right, it can stay like it is currently but only on the right. the left should still apply this behaviour of dissapearing at the border of the parent)

The phone toolbar draws above the hints modal, which looks really odd. fix that.

how come i'm able to scroll the page on mobile when focussed on the input and having the keyboard out (so i acn position the input better if need be), but i cant scroll on tabled when the keyboard is out? (although, after writing this i also cant on mobile... just make it possible on both devices)

I'd like the stats page to be more like in the original design, where:
- The bar was only the right answers (so only the part that's currently green), and that bar was colored according to if it was a large percentage, medium or bad percentage (red, yellow, red).
- The text should then be "mastery by chapter" instead of the current "right and wrong by chapter" (because that feels more encouraging)
- on tablet, i don't want the bars to be the full width of that container. i want them just like in the original design. so: chapter nr, chapter name, bar, percentage right, avg time (and have these lined up across all chapters)
- The "x right, x wrong, x sure but wrong" text should become a tooltip on hover, appearing when hovering over the whole element (by element i mean the parent that holds the chapter name, time, percentage and the bars).
- the confidense x correctness boxes should move the "solid"/"fragile"/... subtexts to tooltips shown above the number. also, switch the number and the "sure - right"/... texts around.
- also, give me some suggestoins of other metrics that could be interesting or telling. write those in this chat.

right now, all exercises are 10 questions, but i want to have a setting where i can change that numnber. because 10 in 1 sititng (at my current speed) is taking a long time. (and when i can faster, i can increase it by then). 10 can remain the default.

put the "smaller/larger x" texts above the inputs, instead of next to them taking up valuable space

some rules (like ch6 exp and ln undo each other) have raw latex in the short explaination. make sure that gets parsed correctly. and also that rule is a good example of a plain text power of 3, which should just be "t^3" in latex (another example is the power of 2 in "ch8 quadratic formula" explaination text).

lastly i want you to take a look at this pdf and verify that everything it coveres is also covered in these generators: https://staff.science.ru.nl/KoenvanAsseldonk/Mathematics_Practice_Book_202508150806.pdf
- if anything's missing/incomplete/wrong (except chapters 5 and 12 ofcource), type it in this chat