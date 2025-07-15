
"use client";

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import NextImage from "next/image";
import {
  UploadCloud,
  FileImage,
  Lock,
  Unlock,
  Download,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { ScrollArea } from "@/components/ui/scroll-area";

type Format = "jpeg" | "png" | "webp";

interface ImageInfo {
  file: File;
  preview: string;
  width: number;
  height: number;
}

export default function Home() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [format, setFormat] = useState<Format>("jpeg");
  const [quality, setQuality] = useState<number>(80);
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastEdited, setLastEdited] = useState<'width' | 'height' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    
    if(imageFiles.length === 0) {
        toast({
            title: "No valid files",
            description: "Please upload valid image files (PNG, JPEG, WebP, etc.).",
            variant: "destructive",
        });
        return;
    }

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setImages(prevImages => {
            const newImage = {
              file,
              preview: resultStr,
              width: img.width,
              height: img.height,
            };
            if (prevImages.length === 0) {
              setWidth(String(img.width));
              setHeight(String(img.height));
            }
            return [...prevImages, newImage];
          });
        };
        img.src = resultStr;
      };
      reader.readAsDataURL(file);
    });
  };
  
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleImageUpload(e.target.files);
      e.target.value = ""; // Reset file input
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDrag(e, false);
    if (e.dataTransfer.files) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    if (!keepAspectRatio || images.length === 0 || lastEdited !== 'width') return;
    
    const firstImage = images[0];
    const aspectRatio = firstImage.width / firstImage.height;
    const newWidth = parseInt(width, 10);

    if (!isNaN(newWidth)) {
      setHeight(String(Math.round(newWidth / aspectRatio)));
    }
  }, [width, keepAspectRatio, images, lastEdited]);

  useEffect(() => {
    if (!keepAspectRatio || images.length === 0 || lastEdited !== 'height') return;
    
    const firstImage = images[0];
    const aspectRatio = firstImage.width / firstImage.height;
    const newHeight = parseInt(height, 10);
    
    if (!isNaN(newHeight)) {
      setWidth(String(Math.round(newHeight * aspectRatio)));
    }
  }, [height, keepAspectRatio, images, lastEdited]);

  const handleDownload = async () => {
    if (images.length === 0) {
      toast({
        title: "No Images",
        description: "Please upload one or more images first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      if (images.length === 1) {
        // Single image download
        const imageInfo = images[0];
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");
        
        const img = new Image();
        img.src = imageInfo.preview;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const newWidth = parseInt(width, 10);
        const newHeight = parseInt(height, 10);
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        const mimeType = `image/${format}`;
        const dataUrl = canvas.toDataURL(mimeType, format !== 'png' ? quality / 100 : undefined);

        const link = document.createElement("a");
        link.href = dataUrl;
        const originalName = imageInfo.file.name.substring(0, imageInfo.file.name.lastIndexOf('.'));
        link.download = `${originalName}_${newWidth}x${newHeight}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Bulk download as zip
        const zip = new JSZip();
        const newWidth = parseInt(width, 10);
        const newHeight = parseInt(height, 10);

        for (const imageInfo of images) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");
            
            const img = new Image();
            img.src = imageInfo.preview;

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
            });
            
            // Adjust dimensions for each image while maintaining aspect ratio if locked
            let finalWidth = newWidth, finalHeight = newHeight;
            if(keepAspectRatio){
                const aspectRatio = imageInfo.width / imageInfo.height;
                if(lastEdited === 'width' || !lastEdited){
                    finalHeight = Math.round(newWidth / aspectRatio);
                } else {
                    finalWidth = Math.round(newHeight * aspectRatio);
                }
            }

            canvas.width = finalWidth;
            canvas.height = finalHeight;
            ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

            const mimeType = `image/${format}`;
            const dataUrl = canvas.toDataURL(mimeType, format !== 'png' ? quality / 100 : undefined);
            
            const originalName = imageInfo.file.name.substring(0, imageInfo.file.name.lastIndexOf('.'));
            const fileName = `${originalName}_${finalWidth}x${finalHeight}.${format}`;
            zip.file(fileName, dataUrl.split(',')[1], { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = `Imagerite_processed_images.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
      
       toast({
        title: "Download Started",
        description: "Your processed image(s) are downloading.",
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: "Something went wrong while processing your images.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="text-accent h-6 w-6" />
              <CardTitle className="text-2xl font-headline">Imagerite</CardTitle>
            </div>
            <CardDescription>Upload, resize, and optimize your images in seconds.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-6">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200",
                isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDragOver={(e) => handleDrag(e, true)}
              onDrop={handleDrop}
            >
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-semibold text-accent">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
                multiple
              />
            </div>
            
            {images.length > 0 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="width">Width (px)</Label>
                        <Input id="width" type="number" value={width} onChange={(e) => { setWidth(e.target.value); setLastEdited('width'); }} placeholder={images.length > 1 ? "Auto" : ""} />
                    </div>
                    <Button variant="ghost" size="icon" className="mb-1" onClick={() => setKeepAspectRatio(!keepAspectRatio)}>
                        {keepAspectRatio ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <div className="space-y-2">
                        <Label htmlFor="height">Height (px)</Label>
                        <Input id="height" type="number" value={height} onChange={(e) => { setHeight(e.target.value); setLastEdited('height'); }} placeholder={images.length > 1 ? "Auto" : ""} />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                   <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                    <SelectTrigger id="format" className="w-full">
                      <SelectValue placeholder="Select a format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {format !== 'png' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="quality">Quality</Label>
                      <span className="text-sm font-medium text-muted-foreground">{quality}%</span>
                    </div>
                    <Slider
                      id="quality"
                      min={1}
                      max={100}
                      step={1}
                      value={[quality]}
                      onValueChange={(v) => setQuality(v[0])}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={handleDownload}
              disabled={images.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? "Processing..." : `Download ${images.length > 1 ? `${images.length} Images` : 'Image'}`}
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex items-center justify-center p-4 min-h-[400px] lg:min-h-0 bg-card/50">
          {images.length > 0 ? (
            <ScrollArea className="w-full h-full max-h-[70vh]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                {images.map((image, index) => (
                    <div key={index} className="relative group aspect-square">
                    <NextImage
                        src={image.preview}
                        alt={`Image Preview ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        style={{ objectFit: 'cover' }}
                        className="rounded-lg"
                    />
                     <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-1 rounded-b-lg">
                        {image.width}x{image.height}
                    </div>
                    </div>
                ))}
                </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground">
              <FileImage className="mx-auto h-24 w-24" />
              <p className="mt-4 font-medium">Image Preview</p>
              <p className="text-sm">Your uploaded images will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
