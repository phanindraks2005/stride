export const toolDefinitions = [
  {
    name: 'log_entry',
    description: 'Log a value against one of the user\'s existing trackers, e.g. logging water intake or workout minutes.',
    parameters: {
      type: 'object',
      properties: {
        tracker_name: {
          type: 'string',
          description: 'The name of the tracker to log against, e.g. "Water" or "Protein"',
        },
        value: {
          type: 'number',
          description: 'The numeric value to log',
        },
      },
      required: ['tracker_name', 'value'],
    },
  },
  {
    name: 'create_tracker',
    description: 'Create a new custom tracker for the user when they ask to track something new.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the new tracker' },
        unit: { type: 'string', description: 'Unit of measurement, e.g. "ml", "g", "hrs", "mins"' },
        target_value: { type: 'number', description: 'Daily target/goal for this tracker' },
      },
      required: ['name', 'unit', 'target_value'],
    },
  },
  {
    name: 'generate_meal_plan',
    description: 'Generate a structured meal suggestion when the user asks what to eat, wants a meal plan, or needs help hitting a nutrition goal like remaining protein or calories.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title, e.g. "High-Protein Dinner"' },
        meals: {
          type: 'array',
          description: 'List of food items in the plan',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              protein_g: { type: 'number' },
              calories: { type: 'number' },
            },
            required: ['name'],
          },
        },
        note: { type: 'string', description: 'A short helpful note or tip about this plan' },
      },
      required: ['title', 'meals'],
    },
  },
  {
    name: 'generate_workout_plan',
    description: 'Generate a structured workout suggestion when the user asks for a workout, wants exercise ideas, or needs help hitting their workout minutes goal.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title, e.g. "Quick Upper Body Session"' },
        exercises: {
          type: 'array',
          description: 'List of exercises in the workout',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              sets: { type: 'number' },
              reps: { type: 'string', description: 'e.g. "12" or "30 seconds"' },
            },
            required: ['name'],
          },
        },
        duration_mins: { type: 'number', description: 'Estimated total duration in minutes' },
        note: { type: 'string', description: 'A short helpful note or tip' },
      },
      required: ['title', 'exercises'],
    },
  },
]