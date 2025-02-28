import { defs, tiny } from './examples/common.js';

const {
    Vector, Vector3, vec, vec2, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const { Cube, Axis_Arrows, Textured_Phong } = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows()
        }
        console.log(this.shapes.box_1.arrays.texture_coord)

        const texture_coords = this.shapes.box_2.arrays.texture_coord;
        for (let i = 0; i < texture_coords.length; i += 4) {
            texture_coords[i] = [0, 0];
            texture_coords[i + 1] = [2, 0];
            texture_coords[i + 2] = [0, 2];
            texture_coords[i + 3] = [2, 2];
        }
        console.log(this.shapes.box_2.arrays.texture_coord);

        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            texture: new Material(new Texture_Rotate(), {
                color: hex_color("#ffffff"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/cat_g.jpg", "NEAREST")
            }),
            texture2: new Material(new Texture_Scroll_X(), {
                color: hex_color("#ffffff"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/cat_b.jpg", "LINEAR_MIPMAP_LINEAR")
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    rotate = false;
    rot_speed = (15 * 2 * Math.PI) / 60; //15 rpm
    rot_t = 0.00001;
    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Cube Rotation", ["c"], () => this.rotate = !this.rotate);
        this.new_line();
        //this.key_triggered_button("Test", ["t"], () => console.log(this.rotate));
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        // TODO:  Draw the required boxes. Also update their stored matrices.
        let b1_m = Mat4.rotation(this.rot_speed * this.rot_t, 0, 1, 0);
        let b2_m = Mat4.rotation(this.rot_speed * this.rot_t, 1, 0, 0);
        if (this.rotate) {
            this.rot_t += dt;
        }
        this.shapes.box_1.draw(context, program_state, model_transform.times(Mat4.translation(-2, 0, 0)).times(b2_m),
            this.materials.texture)
        this.shapes.box_2.draw(context, program_state, model_transform.times(Mat4.translation(2, 0, 0)).times(b1_m),
            this.materials.texture2)
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;// pre interpolated
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){

                vec2 new_tex_coord = vec2(f_tex_coord.x - animation_time * 0.4, f_tex_coord.y); // scrolled
                vec4 tex_color = texture2D( texture, new_tex_coord);
                if( tex_color.w < .01 ) discard;

                float sq_x = mod(new_tex_coord.x, 1.0);
                float sq_y = mod(new_tex_coord.y, 1.0);

                if ((sq_x > 0.15 && sq_x < 0.25 && sq_y > 0.15 && sq_y < 0.85) ||  
                    (sq_x > 0.75 && sq_x < 0.85 && sq_y > 0.15 && sq_y < 0.85) ||  
                    (sq_y > 0.15 && sq_y < 0.25 && sq_x > 0.15 && sq_x < 0.85) ||  
                    (sq_y > 0.75 && sq_y < 0.85 && sq_x > 0.15 && sq_x < 0.85)) {  
                        tex_color = vec4(0, 0, 0, 1.0);
                }

                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){

                float radians_per_second = -8.0 * 4.0 * 3.14159265359 / 60.0;
                float rotation_angle = mod(animation_time * radians_per_second, 2.0 * 3.14159265359);

                // rotate about the center
                vec2 centered_tex_coord = f_tex_coord - vec2(0.5, 0.5);
                vec2 rotated_tex_coord = vec2(
                    centered_tex_coord.x * cos(rotation_angle) - centered_tex_coord.y * sin(rotation_angle),
                    centered_tex_coord.x * sin(rotation_angle) + centered_tex_coord.y * cos(rotation_angle)
                ) + vec2(0.5, 0.5);


                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, rotated_tex_coord );

                float sq_x = mod(rotated_tex_coord.x, 1.0);
                float sq_y = mod(rotated_tex_coord.y, 1.0);

                if ((sq_x > 0.15 && sq_x < 0.25 && sq_y > 0.15 && sq_y < 0.85) ||  
                    (sq_x > 0.75 && sq_x < 0.85 && sq_y > 0.15 && sq_y < 0.85) ||  
                    (sq_y > 0.15 && sq_y < 0.25 && sq_x > 0.15 && sq_x < 0.85) ||  
                    (sq_y > 0.75 && sq_y < 0.85 && sq_x > 0.15 && sq_x < 0.85)) {  
                        tex_color = vec4(0, 0, 0, 1.0);
                }

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

