import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: any = {};

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  // Desc: Make everything lowercase then using regex trim the recipeName then split every word so we can 
  // have every word start with a capital letter 
  recipeName = recipeName.toLowerCase().replace(/[^a-z-_ ]/g, "");
  recipeName = recipeName.replace(/[^a-z-_ ]/g, "");
  recipeName = recipeName.replace(/[-_]/g, " ");
  recipeName = recipeName.trim();
  
  let curr = recipeName.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1));
  recipeName = curr.join(" ");

  if (recipeName.length == 0) {
    return null
  }

  return recipeName
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook


// Checking that the the data passed is of the right type
const isCookbookEntry = (entry: any): entry is cookbookEntry => {
  if (typeof entry.name === "string" && typeof entry.type === "string") {
    return true;
  }
  return false;
};

const isRecipe = (entry: any): entry is recipe => {
  if (!isCookbookEntry(entry) || entry.type !== "recipe" || !Array.isArray((entry as recipe).requiredItems)) {
    return false;
  }

  const uniqueItems = new Set();
  for (const item of (entry as recipe).requiredItems) {
    if (typeof item.name !== "string" || typeof item.quantity !== "number") {
      return false;
    }
    if (uniqueItems.has(item.name)) {
      return false; // Duplicate item name found
    }
    uniqueItems.add(item.name);
  }
  return true;
};

const isIngredient = (entry: any): entry is ingredient => {
  return isCookbookEntry(entry) && entry.type === "ingredient" && typeof (entry as ingredient).cookTime === "number";
};

app.post("/entry", (req:Request, res:Response) => {
  // first we check if the data passed is of the right type and is suitable to be saved
  // then the data is saved as itemName: {item} so we can search for it in O(n) will be useful for
  // Task 3 as well
  const entry = req.body;

  if (!isCookbookEntry(entry)) {
    return res.status(400).send({ error: "Invalid entry format" });
  }

  if (entry.type === "recipe" && !isRecipe(entry)) {
    return res.status(400).send({ error: "Invalid recipe format or duplicate ingredients" });
  }

  if (entry.type === "ingredient" && !isIngredient(entry)) {
    return res.status(400).send({ error: "Invalid ingredient format" });
  }

  if (entry.type === "ingredient") {
    if ((entry as ingredient).cookTime < 0) {
      return res.status(400).send({ error: "Invalid cookTime" });
    }
  }

  if (entry.name in cookbook) {
    return res.status(400).send({ error: "Entry already exists" });
  }

  if (entry.type != "recipe" && entry.type != "ingredient") {
    return res.status(400).send({ error: "Wrong type" });
  }

  cookbook[entry.name] = entry;
  res.status(200).send({});

});

// [TASK 3] ====================================================================

// Recursively checking and adding all ingredients for a recipe into a list
const findAllItems = (item: requiredItem, ingredientList: requiredItem[]): number => {
  if (!(item.name in cookbook)) {
    throw new Error(`Item ${item.name} not found in the cookbook.`);
  }

  const entry = cookbook[item.name];

  if (entry.type === "ingredient") {
    ingredientList.push({ name: item.name, quantity: item.quantity });
    return entry.cookTime * item.quantity;
  }

  let totalCookTime = 0;
  if (entry.type === "recipe") {
    for (const subItem of entry.requiredItems) {
      totalCookTime += findAllItems(
        { name: subItem.name, quantity: subItem.quantity * item.quantity },
        ingredientList
      );
    }
  }

  return totalCookTime;
};

// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Response) => {
  // checking if a recipe exists in cookbook if it does for every ingredient found adding it to the ingredient list
  // for every recipe recursively finding all ingredients required and adding it all onto ingredientList, at the same
  // time calculating totalCookTime
  const recipe = req.query.name;
  let ingredientList = [];
  let totalCookTime = 0;

  if (!(recipe in cookbook) || cookbook[recipe].type !== "recipe") {
      return res.status(400).send("recipe not found!");
  }

  try {
      for (const item of cookbook[recipe].requiredItems) {
          if (!(item.name in cookbook)) {
              return res.status(400).send("item not found!");
          }

          if (cookbook[item.name].type === "recipe") {
              totalCookTime += findAllItems(item, ingredientList);
          } else {
              ingredientList.push({ "name": item.name, "quantity": item.quantity });
              totalCookTime += cookbook[item.name].cookTime * item.quantity;
          }
      }

      return res.status(200).json({ "name": recipe, "cookTime": totalCookTime, "ingredients": ingredientList });

  } catch (error) {
      return res.status(400).send(error.message);
  }
});


// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
